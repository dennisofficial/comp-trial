'use client';

import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { makeStore, type PreloadedRootState } from './store';

type StoreProviderProps = {
  children: ReactNode;
  preloadedState?: PreloadedRootState;
};

export function StoreProvider({ children, preloadedState }: StoreProviderProps) {
  // A lazy initialiser rather than a ref written during render — same once-per-instance
  // guarantee, and the React Compiler (enabled in next.config.ts) has nothing to flag.
  const [store] = useState(() => makeStore(preloadedState));

  return <Provider store={store}>{children}</Provider>;
}
