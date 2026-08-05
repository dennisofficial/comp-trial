import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PingList } from '@/components/ping-list';
import { api } from '@/store/api';
import { preloadApiState } from '@/store/preload';
import { StoreProvider } from '@/store/store-provider';

const PING = { id: 'png_1', note: 'seeded', createdAt: '2026-08-04T12:00:00.000Z' };

const mockFetch = vi.fn();

// A fresh Response per call: a body can only be read once, and the error case fetches
// twice — the prefetch, then RTK Query's retry on mount.
const respondWith = (body: unknown, status: number) => () =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  mockFetch.mockImplementation(respondWith({ data: [PING] }, 200));
});

describe('server prefetch handed to the client store', () => {
  it('drains the running query so the returned state actually holds the data', async () => {
    const state = await preloadApiState((store) => {
      store.dispatch(api.endpoints.listPings.initiate());
    });

    const entries = Object.values(state.api.queries);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('fulfilled');
    expect(entries[0]?.data).toEqual({ data: [PING] });
  });

  it('renders the seeded data without the client issuing its own request', async () => {
    const preloadedState = await preloadApiState((store) => {
      store.dispatch(api.endpoints.listPings.initiate());
    });

    const callsAfterPrefetch = mockFetch.mock.calls.length;

    render(
      <StoreProvider preloadedState={preloadedState}>
        <PingList />
      </StoreProvider>,
    );

    expect(screen.getByText('seeded')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(mockFetch.mock.calls).toHaveLength(callsAfterPrefetch);
  });

  it('shows a recoverable error instead of an empty list when the API is unreachable', async () => {
    mockFetch.mockImplementation(respondWith({ message: 'unavailable' }, 503));

    const preloadedState = await preloadApiState((store) => {
      store.dispatch(api.endpoints.listPings.initiate());
    });

    const entry = Object.values(preloadedState.api.queries)[0];

    expect(entry?.status).toBe('rejected');
    expect(entry?.error).toMatchObject({ status: 503 });

    render(
      <StoreProvider preloadedState={preloadedState}>
        <PingList />
      </StoreProvider>,
    );

    // A preloaded rejection makes RTK Query retry on mount, so the failure surfaces after
    // that retry also fails — never as a bare empty list.
    expect(await screen.findByText('Could not reach the API.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText('Nothing yet.')).not.toBeInTheDocument();
  });
});
