import { configureStore } from '@reduxjs/toolkit';

import { api } from './api';

// A factory, never a module-level singleton: the App Router serves concurrent requests
// from one process, and a shared store would leak one visitor's data into another's HTML.
export function makeStore(preloadedState?: PreloadedRootState) {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    preloadedState,
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

// What a Server Component hands to the client provider. Declared separately from
// `RootState` because it crosses the RSC boundary and so must stay plain data.
export type PreloadedRootState = {
  [api.reducerPath]: ReturnType<typeof api.reducer>;
};
