import { api } from './api';
import { makeStore, type AppStore, type PreloadedRootState } from './store';

/**
 * Fills a throwaway store inside a Server Component and returns its state for the client
 * store to start from — so the HTML ships with the data and the browser does not refetch.
 *
 * The await is load-bearing: `initiate` returns before the cache is written, so without
 * draining the running queries the returned state would be empty.
 */
export async function preloadApiState(
  dispatchQueries: (store: AppStore) => void,
): Promise<PreloadedRootState> {
  const store = makeStore();

  dispatchQueries(store);

  await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()));

  return store.getState();
}
