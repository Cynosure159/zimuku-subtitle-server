import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  lastDownloadPath: string | null;
  toggleSidebar: () => void;
  setLastDownloadPath: (path: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  lastDownloadPath: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLastDownloadPath: (path) => set({ lastDownloadPath: path }),
}));
