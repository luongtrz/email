import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "traditional" | "kanban";

export type SortOption = "newest" | "oldest" | "sender_asc" | "sender_desc";

export type FilterMode = "ALL" | "UNREAD" | "STARRED" | "HAS_ATTACHMENT";

interface DashboardState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  
  // Kanban sorting
  sortBy: SortOption;
  setSortBy: (sortBy: SortOption) => void;
  
  // Kanban filtering
  filterMode: FilterMode;
  setFilterMode: (filterMode: FilterMode) => void;
  
  // Search state
  searchQuery: string;
  isSearchMode: boolean;
  previousViewMode: ViewMode | null;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      viewMode: "traditional",
      sortBy: "newest",
      filterMode: "ALL",
      searchQuery: "",
      isSearchMode: false,
      previousViewMode: null,

      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

      toggleViewMode: () => {
        const currentMode = get().viewMode;
        const newMode =
          currentMode === "traditional" ? "kanban" : "traditional";
        set({ viewMode: newMode });
      },
      
      setSortBy: (sortBy: SortOption) => set({ sortBy }),
      
      setFilterMode: (filterMode: FilterMode) => set({ filterMode }),
      
      setSearchQuery: (query: string) => {
        const trimmedQuery = query.trim();
        const state = get();
        
        // If starting a search (query becomes non-empty)
        if (trimmedQuery.length > 0 && !state.isSearchMode) {
          set({ 
            searchQuery: trimmedQuery,
            isSearchMode: true,
            previousViewMode: state.viewMode,
            viewMode: "traditional" // Switch to list view for search results
          });
        }
        // If clearing search (query becomes empty)
        else if (trimmedQuery.length === 0 && state.isSearchMode) {
          set({ 
            searchQuery: "",
            isSearchMode: false,
            viewMode: state.previousViewMode || "traditional",
            previousViewMode: null
          });
        }
        // Just updating the query
        else {
          set({ searchQuery: trimmedQuery });
        }
      },
      
      clearSearch: () => {
        const state = get();
        set({ 
          searchQuery: "",
          isSearchMode: false,
          viewMode: state.previousViewMode || "traditional",
          previousViewMode: null
        });
      },
    }),
    {
      name: "dashboard-view-mode",
      // Persist viewMode, sortBy, and filterMode (not search state)
      partialize: (state) => ({ 
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        filterMode: state.filterMode
      }),
    }
  )
);
