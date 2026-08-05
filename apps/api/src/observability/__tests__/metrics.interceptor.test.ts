import { type CallHandler, type ExecutionContext, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

const { count, distribution } = vi.hoisted(() => ({ count: vi.fn(), distribution: vi.fn() }));

vi.mock('@sentry/nestjs', () => ({ metrics: { count, distribution } }));

import { MetricsInterceptor } from '../metrics.interceptor';

const createContext = ({
  type = 'http',
  route,
  method = 'GET',
  statusCode = 200,
}: {
  type?: string;
  route?: string;
  method?: string;
  statusCode?: number;
}): ExecutionContext =>
  ({
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => ({ route: route === undefined ? undefined : { path: route }, method }),
      getResponse: () => ({ statusCode }),
    }),
  }) as unknown as ExecutionContext;

const handlerReturning = (value: unknown): CallHandler =>
  ({ handle: () => of(value) }) as CallHandler;

const handlerThrowing = (error: unknown): CallHandler =>
  ({ handle: () => throwError(() => error) }) as CallHandler;

describe('MetricsInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records the route pattern and status for a successful request', async () => {
    const interceptor = new MetricsInterceptor();
    const context = createContext({ route: '/v1/health', statusCode: 200 });

    await new Promise((resolve) =>
      interceptor.intercept(context, handlerReturning({ status: 'ok' })).subscribe(resolve),
    );

    expect(count).toHaveBeenCalledWith('http.server.request', 1, {
      attributes: { route: '/v1/health', method: 'GET', status: 200 },
    });
    expect(distribution).toHaveBeenCalledWith(
      'http.server.duration',
      expect.any(Number),
      expect.objectContaining({ unit: 'millisecond' }),
    );
  });

  it('reads the status off the exception instead of the not-yet-written response', async () => {
    const interceptor = new MetricsInterceptor();
    const context = createContext({ route: '/v1/health', statusCode: 200 });

    await new Promise((resolve) =>
      interceptor
        .intercept(context, handlerThrowing(new NotFoundException()))
        .subscribe({ error: resolve }),
    );

    expect(count).toHaveBeenCalledWith('http.server.request', 1, {
      attributes: { route: '/v1/health', method: 'GET', status: 404 },
    });
  });

  it('falls back to 500 for a plain Error', async () => {
    const interceptor = new MetricsInterceptor();
    const context = createContext({ route: '/v1/health', method: 'POST' });

    await new Promise((resolve) =>
      interceptor.intercept(context, handlerThrowing(new Error('boom'))).subscribe({
        error: resolve,
      }),
    );

    expect(count).toHaveBeenCalledWith('http.server.request', 1, {
      attributes: { route: '/v1/health', method: 'POST', status: 500 },
    });
  });

  it('labels unmatched routes rather than emitting undefined', async () => {
    const interceptor = new MetricsInterceptor();
    const context = createContext({ route: undefined });

    await new Promise((resolve) =>
      interceptor.intercept(context, handlerReturning(null)).subscribe(resolve),
    );

    expect(count).toHaveBeenCalledWith('http.server.request', 1, {
      attributes: { route: 'unmatched', method: 'GET', status: 200 },
    });
  });

  it('ignores non-http contexts', async () => {
    const interceptor = new MetricsInterceptor();
    const context = createContext({ type: 'rpc' });

    await new Promise((resolve) =>
      interceptor.intercept(context, handlerReturning('payload')).subscribe(resolve),
    );

    expect(count).not.toHaveBeenCalled();
    expect(distribution).not.toHaveBeenCalled();
  });
});
