import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  selectedMediaId: number | null;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedMediaId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  selectedMediaId: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),
}));
