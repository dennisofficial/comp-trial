import * as Sentry from '@sentry/nextjs';

type MetricAttributes = Record<string, string | number | boolean>;

export function recordEvent({
  name,
  attributes,
}: {
  name: string;
  attributes?: MetricAttributes;
}): void {
  Sentry.metrics.count(name, 1, attributes ? { attributes } : undefined);
}

export function recordGauge({
  name,
  value,
  unit,
  attributes,
}: {
  name: string;
  value: number;
  unit?: string;
  attributes?: MetricAttributes;
}): void {
  Sentry.metrics.gauge(name, value, { unit, attributes });
}
