import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "traditional" | "kanban";

interface DashboardState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      viewMode: "traditional",

      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

      toggleViewMode: () => {
        const currentMode = get().viewMode;
        const newMode =
          currentMode === "traditional" ? "kanban" : "traditional";
        set({ viewMode: newMode });
      },
    }),
    {
      name: "dashboard-view-mode",
      // Only persist viewMode, not the actions
      partialize: (state) => ({ viewMode: state.viewMode }),
    }
  )
);
