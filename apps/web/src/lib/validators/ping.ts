import { z } from 'zod';

import type { CreatePingDto } from '@/store/api';

// Client-side form validation only — the authority is `CreatePingDto` in apps/api, which
// the global ValidationPipe enforces. Keep the rules and messages in step with it.
export const createPingSchema = z.object({
  note: z.string().trim().min(1, 'Note is required').max(280, 'Keep it under 280 characters'),
});

export type CreatePingInput = z.infer<typeof createPingSchema>;

// The two dialects cannot be unified, so this makes them fail loudly instead of drifting:
// if the DTO gains or renames a field, `bun run typecheck` breaks here.
type SchemaMatchesDto = CreatePingInput extends CreatePingDto
  ? CreatePingDto extends CreatePingInput
    ? true
    : never
  : never;

export const schemaMatchesDto: SchemaMatchesDto = true;
