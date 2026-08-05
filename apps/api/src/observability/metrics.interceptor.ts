import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
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

    const route = this.resolveRoutePath(request);
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
        error: (error: unknown) => record(this.resolveErrorStatus(error)),
      }),
    );
  }

  private resolveRoutePath(request: Request): string {
    const route: unknown = request.route;

    if (typeof route !== 'object' || route === null) return 'unmatched';
    if (!('path' in route) || typeof route.path !== 'string') return 'unmatched';

    return route.path;
  }

  private resolveErrorStatus(error: unknown): number {
    if (error instanceof HttpException) return error.getStatus();

    if (typeof error === 'object' && error !== null) {
      if ('status' in error && typeof error.status === 'number') return error.status;
    }

    return 500;
  }
}
