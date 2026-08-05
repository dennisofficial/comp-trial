import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { env } from '@/lib/env';

// An empty slice on purpose: the endpoints are injected by src/store/generated/api.ts,
// which also declares the tag types it derives from the API's `@ApiTags`. Declaring them
// here as well would be a second list to keep in step.
//
// The spec's paths already carry the `/v1` prefix, so `baseUrl` is the bare origin.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: env.NEXT_PUBLIC_API_URL,
    // Set before there is a session to send, so adding auth later touches nothing here.
    credentials: 'include',
  }),
  endpoints: () => ({}),
});
