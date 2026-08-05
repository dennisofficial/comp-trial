import { describe, expect, it } from 'vitest';

import { createPingSchema } from './ping';

describe('createPingSchema', () => {
  it('trims surrounding whitespace before validating', () => {
    const result = createPingSchema.parse({ note: '  hello  ' });

    expect(result.note).toBe('hello');
  });

  it('rejects a note that is only whitespace', () => {
    const result = createPingSchema.safeParse({ note: '   ' });

    expect(result.success).toBe(false);
  });

  it('rejects a note over 280 characters', () => {
    const result = createPingSchema.safeParse({ note: 'x'.repeat(281) });

    expect(result.success).toBe(false);
  });

  it('rejects a missing note rather than coercing it', () => {
    expect(createPingSchema.safeParse({}).success).toBe(false);
    expect(createPingSchema.safeParse({ note: 42 }).success).toBe(false);
  });
});
