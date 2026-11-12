import { create } from 'zustand';

interface AppState {
  version: string;
  isReady: boolean;
  setReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>(set => ({
  version: '0.1.0',
  isReady: true,
  setReady: ready => set({ isReady: ready }),
}));
