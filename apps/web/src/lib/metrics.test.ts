import { beforeEach, describe, expect, it, vi } from 'vitest';

const count = vi.fn();
const gauge = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  metrics: {
    count: (...args: unknown[]) => count(...args),
    gauge: (...args: unknown[]) => gauge(...args),
  },
}));

const { recordEvent, recordGauge } = await import('./metrics');

describe('recordEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omits the options object entirely when there are no attributes', () => {
    recordEvent({ name: 'ping.created' });

    expect(count).toHaveBeenCalledWith('ping.created', 1, undefined);
  });

  it('forwards attributes when given', () => {
    recordEvent({ name: 'ping.rejected', attributes: { reason: 'invalid_payload' } });

    expect(count).toHaveBeenCalledWith('ping.rejected', 1, {
      attributes: { reason: 'invalid_payload' },
    });
  });
});

describe('recordGauge', () => {
  it('passes unit and attributes through', () => {
    vi.clearAllMocks();

    recordGauge({ name: 'ping.backlog', value: 12, unit: 'none', attributes: { queue: 'main' } });

    expect(gauge).toHaveBeenCalledWith('ping.backlog', 12, {
      unit: 'none',
      attributes: { queue: 'main' },
    });
  });
});
