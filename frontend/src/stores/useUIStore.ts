import { create, type StateCreator } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  lastDownloadPath: string | null;
  toggleSidebar: () => void;
  setLastDownloadPath: (path: string) => void;
}

const createUIStore: StateCreator<UIState> = (set) => ({
  sidebarOpen: true,
  lastDownloadPath: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLastDownloadPath: (path: string) => set({ lastDownloadPath: path }),
});

export const useUIStore = create<UIState>(createUIStore);
