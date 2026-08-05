import { baseApi as api } from '../base-api';
export const addTagTypes = ['health', 'pings'] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      checkHealth: build.query<CheckHealthApiResponse, CheckHealthApiArg>({
        query: () => ({ url: `/v1/health` }),
        providesTags: ['health'],
      }),
      listPings: build.query<ListPingsApiResponse, ListPingsApiArg>({
        query: () => ({ url: `/v1/pings` }),
        providesTags: ['pings'],
      }),
      createPing: build.mutation<CreatePingApiResponse, CreatePingApiArg>({
        query: (queryArg) => ({ url: `/v1/pings`, method: 'POST', body: queryArg.createPingDto }),
        invalidatesTags: ['pings'],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as generatedApi };
export type CheckHealthApiResponse = /** status 200  */ HealthReportDto;
export type CheckHealthApiArg = void;
export type ListPingsApiResponse = /** status 200  */ PingListResponseDto;
export type ListPingsApiArg = void;
export type CreatePingApiResponse = /** status 201  */ PingResponseDto;
export type CreatePingApiArg = {
  createPingDto: CreatePingDto;
};
export type HealthReportDto = {
  status: 'ok';
  database: 'reachable';
};
export type PingDto = {
  id: string;
  note: string;
  createdAt: string;
};
export type PingListResponseDto = {
  data: PingDto[];
};
export type PingResponseDto = {
  data: PingDto;
};
export type CreatePingDto = {
  note: string;
};
export const { useCheckHealthQuery, useListPingsQuery, useCreatePingMutation } = injectedRtkApi;
