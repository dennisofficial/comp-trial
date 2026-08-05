import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = performance.now();

    const route = request.route?.path ?? 'unmatched';
    const method = request.method;

    const record = (status: number): void => {
      const attributes = { route, method, status };

      Sentry.metrics.count('http.server.request', 1, { attributes });
      Sentry.metrics.distribution('http.server.duration', performance.now() - startedAt, {
        unit: 'millisecond',
        attributes,
      });
    };

    return next.handle().pipe(
      tap({
        next: () => record(response.statusCode),
        error: (error: unknown) => record(resolveErrorStatus(error)),
      }),
    );
  }
}

function resolveErrorStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 500;

  if ('getStatus' in error && typeof error.getStatus === 'function') {
    const status: unknown = error.getStatus();
    if (typeof status === 'number') return status;
  }

  if ('status' in error && typeof error.status === 'number') return error.status;

  return 500;
}
