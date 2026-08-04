import { z } from 'zod';

/**
 * Single source of truth for the ping payload. The form resolver and the route
 * handler both parse against this, so client and server can never drift.
 */
export const createPingSchema = z.object({
  note: z.string().trim().min(1, 'Note is required').max(280, 'Keep it under 280 characters'),
});

export type CreatePingInput = z.infer<typeof createPingSchema>;

export const pingSchema = z.object({
  id: z.string(),
  note: z.string(),
  createdAt: z.coerce.date(),
});

export type Ping = z.infer<typeof pingSchema>;
