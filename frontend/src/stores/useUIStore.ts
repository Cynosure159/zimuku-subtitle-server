import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  selectedMediaId: number | null;
  lastDownloadPath: string | null;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedMediaId: (id: number | null) => void;
  setLastDownloadPath: (path: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  selectedMediaId: null,
  lastDownloadPath: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),
  setLastDownloadPath: (path) => set({ lastDownloadPath: path }),
}));
