import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "traditional" | "kanban";

export type SortOption = "newest" | "oldest" | "sender_asc" | "sender_desc";

interface DashboardState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  
  // Kanban sorting
  sortBy: SortOption;
  setSortBy: (sortBy: SortOption) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      viewMode: "traditional",
      sortBy: "newest",

      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

      toggleViewMode: () => {
        const currentMode = get().viewMode;
        const newMode =
          currentMode === "traditional" ? "kanban" : "traditional";
        set({ viewMode: newMode });
      },
      
      setSortBy: (sortBy: SortOption) => set({ sortBy }),
    }),
    {
      name: "dashboard-view-mode",
      // Persist both viewMode and sortBy
      partialize: (state) => ({ 
        viewMode: state.viewMode,
        sortBy: state.sortBy 
      }),
    }
  )
);
