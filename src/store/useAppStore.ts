import { create } from "zustand";
import { getStoredTheme, type ThemeMode } from "@/utils/theme";

interface AppState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: getStoredTheme(),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    set({ theme });
  },
}));
