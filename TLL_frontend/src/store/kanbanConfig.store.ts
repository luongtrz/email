import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  KanbanColumnConfig,
  KanbanConfig,
  GmailLabel,
  CreateColumnInput,
} from "../types/kanban-config.types";
import { KanbanStorage, DEFAULT_COLUMNS } from "../utils/kanban-storage.utils";

// ============================================
// STATE INTERFACE
// ============================================

interface KanbanConfigState {
  // State
  columns: KanbanColumnConfig[];
  availableGmailLabels: GmailLabel[];
  isLoading: boolean;
  isLoadingLabels: boolean;
  error: string | null;
  isInitialized: boolean;

  // CRUD Operations (synchronous - localStorage only)
  loadConfig: () => void;
  addColumn: (column: CreateColumnInput) => void;
  updateColumn: (id: string, updates: Partial<KanbanColumnConfig>) => void;
  deleteColumn: (id: string) => void;
  reorderColumns: (sourceIndex: number, destIndex: number) => void;

  // Gmail Label Operations
  setGmailLabels: (labels: GmailLabel[]) => void;
  mapLabelToColumn: (columnId: string, labelId: string, labelName: string) => void;
  unmapLabelFromColumn: (columnId: string) => void;

  // Utility
  resetToDefaults: () => void;
  clearError: () => void;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useKanbanConfigStore = create<KanbanConfigState>((set, get) => {
  // Helper function to save current state to LocalStorage
  const persistState = () => {
    const { columns } = get();
    const config: KanbanConfig = {
      version: 1,
      columns,
      lastModified: new Date().toISOString(),
    };

    try {
      KanbanStorage.save(config);
    } catch (error: any) {
      set({ error: error.message });
    }
  };

  return {
    // Initial state
    columns: [],
    availableGmailLabels: [],
    isLoading: false,
    isLoadingLabels: false,
    error: null,
    isInitialized: false,

    // Load configuration from LocalStorage
    loadConfig: () => {
      set({ isLoading: true, error: null });

      try {
        const savedConfig = KanbanStorage.load();

        if (savedConfig) {
          // Use saved configuration
          set({
            columns: savedConfig.columns,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          // First time user - use defaults
          const defaultConfig = KanbanStorage.getDefaults();
          KanbanStorage.save(defaultConfig);
          set({
            columns: defaultConfig.columns,
            isLoading: false,
            isInitialized: true,
          });
        }
      } catch (error: any) {
        console.error('Failed to load Kanban config:', error);
        // Fallback to defaults
        set({
          columns: DEFAULT_COLUMNS,
          error: error.message,
          isLoading: false,
          isInitialized: true,
        });
      }
    },

    // Add a new column
    addColumn: (columnInput: CreateColumnInput) => {
      const { columns } = get();

      // NEW: Validate no duplicate status (case-insensitive)
      const duplicateStatus = columns.find(
        col => col.status.toUpperCase() === columnInput.status.toUpperCase()
      );
      if (duplicateStatus) {
        set({ error: `Column with status "${columnInput.status}" already exists` });
        return;
      }

      // NEW: Prevent using SNOOZED for non-system columns
      if (columnInput.status.toUpperCase() === 'SNOOZED') {
        set({ error: 'SNOOZED is reserved for system column' });
        return;
      }

      // Check for duplicate label mapping
      if (columnInput.gmailLabelId) {
        const existingColumn = columns.find(
          (col) => col.gmailLabelId === columnInput.gmailLabelId
        );
        if (existingColumn) {
          set({
            error: `Label "${columnInput.gmailLabelName}" is already mapped to column "${existingColumn.title}"`,
          });
          return;
        }
      }

      const newColumn: KanbanColumnConfig = {
        ...columnInput,
        id: uuidv4(), // Client-side UUID
        isSystem: false, // Never allow creating system columns
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({ columns: [...columns, newColumn], error: null });
      persistState();
    },

    // Update an existing column
    updateColumn: (id: string, updates: Partial<KanbanColumnConfig>) => {
      const { columns } = get();

      // Check for duplicate label mapping if label is being updated
      if (updates.gmailLabelId) {
        const existingColumn = columns.find(
          (col) => col.gmailLabelId === updates.gmailLabelId && col.id !== id
        );
        if (existingColumn) {
          set({
            error: `Label "${updates.gmailLabelName}" is already mapped to column "${existingColumn.title}"`,
          });
          return;
        }
      }

      // Find column to update
      const columnToUpdate = columns.find((col) => col.id === id);
      if (!columnToUpdate) {
        set({ error: `Column with id "${id}" not found` });
        return;
      }

      // Prevent modifying critical fields of system columns
      if (columnToUpdate.isSystem) {
        if (updates.status && updates.status !== 'SNOOZED') {
          set({ error: "Cannot change status of Snoozed column" });
          return;
        }
        if (updates.isSystem === false) {
          set({ error: "Cannot remove system flag from Snoozed column" });
          return;
        }
      }

      // NEW: Validate no duplicate status when updating
      if (updates.status) {
        const duplicateStatus = columns.find(
          col => col.status.toUpperCase() === updates.status!.toUpperCase() && col.id !== id
        );
        if (duplicateStatus) {
          set({ error: `Column "${duplicateStatus.title}" already uses status "${updates.status}"` });
          return;
        }
      }

      const updatedColumns = columns.map((col) =>
        col.id === id
          ? { ...col, ...updates, updatedAt: new Date().toISOString() }
          : col
      );

      set({ columns: updatedColumns, error: null });
      persistState();
    },

    // Delete a column
    deleteColumn: (id: string) => {
      const { columns } = get();
      const columnToDelete = columns.find((col) => col.id === id);

      if (!columnToDelete) {
        set({ error: `Column with id "${id}" not found` });
        return;
      }

      // Prevent deleting system columns
      if (columnToDelete.isSystem) {
        set({ error: "Cannot delete system column (Snoozed)" });
        return;
      }

      set({
        columns: columns.filter((col) => col.id !== id),
        error: null,
      });
      persistState();
    },

    // Reorder columns via drag-and-drop
    reorderColumns: (sourceIndex: number, destIndex: number) => {
      const { columns } = get();

      if (
        sourceIndex < 0 ||
        sourceIndex >= columns.length ||
        destIndex < 0 ||
        destIndex >= columns.length
      ) {
        set({ error: "Invalid reorder indices" });
        return;
      }

      const reordered = [...columns];
      const [removed] = reordered.splice(sourceIndex, 1);
      reordered.splice(destIndex, 0, removed);

      // Update order numbers
      const withNewOrder = reordered.map((col, index) => ({
        ...col,
        order: index,
      }));

      set({ columns: withNewOrder, error: null });
      persistState();
    },

    // Set available Gmail labels
    setGmailLabels: (labels: GmailLabel[]) => {
      set({ availableGmailLabels: labels, isLoadingLabels: false });
    },

    // Map a Gmail label to a column
    mapLabelToColumn: (columnId: string, labelId: string, labelName: string) => {
      const { columns } = get();

      // Check if label is already mapped to another column
      const existingColumn = columns.find(
        (col) => col.gmailLabelId === labelId && col.id !== columnId
      );

      if (existingColumn) {
        set({
          error: `Label "${labelName}" is already mapped to column "${existingColumn.title}"`,
        });
        return;
      }

      get().updateColumn(columnId, {
        gmailLabelId: labelId,
        gmailLabelName: labelName,
      });
    },

    // Remove Gmail label mapping from a column
    unmapLabelFromColumn: (columnId: string) => {
      get().updateColumn(columnId, {
        gmailLabelId: null,
        gmailLabelName: null,
      });
    },

    // Reset to default configuration
    resetToDefaults: () => {
      const defaultConfig = KanbanStorage.getDefaults();
      set({ columns: defaultConfig.columns, error: null });
      KanbanStorage.save(defaultConfig);
    },

    // Clear error message
    clearError: () => {
      set({ error: null });
    },
  };
});

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the store on app load
 * Call this once in your root component
 */
export const initializeKanbanConfig = () => {
  const store = useKanbanConfigStore.getState();
  if (!store.isInitialized) {
    store.loadConfig();
  }
};
