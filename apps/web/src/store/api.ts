import { recordEvent } from '@/lib/metrics';

import { generatedApi } from './generated/api';

// The app's import surface. Nothing outside this file should reach into `generated/` —
// that file is overwritten by `bun run openapi:codegen` and must never be hand-edited.
export const api = generatedApi.enhanceEndpoints({
  endpoints: {
    createPing: {
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
          recordEvent({ name: 'ping.created' });
        } catch {
          // The component surfaces the failure to the user. A rejected mutation must not
          // also become an unhandled rejection here.
        }
      },
    },
  },
});

export const { useListPingsQuery, useCreatePingMutation, useCheckHealthQuery } = api;

export type { CreatePingDto, PingDto, PingListResponseDto, PingResponseDto } from './generated/api';
