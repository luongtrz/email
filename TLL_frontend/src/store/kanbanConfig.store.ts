import { create } from "zustand";
import type {
  KanbanColumnConfig,
  KanbanConfig,
  GmailLabel,
  CreateColumnInput,
} from "../types/kanban-config.types";
import { KanbanStorage, DEFAULT_COLUMNS } from "../utils/kanban-storage.utils";
import { KanbanEmailStatus } from "../types/kanban.types";
import { kanbanService } from "../services/kanban.service";

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

  // CRUD Operations (now async to sync with backend)
  loadConfig: () => Promise<void>;
  addColumn: (column: CreateColumnInput) => Promise<void>;
  updateColumn: (id: string, updates: Partial<KanbanColumnConfig>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (sourceIndex: number, destIndex: number) => void;

  // Gmail Label Operations
  setGmailLabels: (labels: GmailLabel[]) => void;
  mapLabelToColumn: (columnId: string, labelId: string, labelName: string) => Promise<void>;
  unmapLabelFromColumn: (columnId: string) => Promise<void>;

  // Utility
  resetToDefaults: () => void;
  clearError: () => void;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useKanbanConfigStore = create<KanbanConfigState>((set, get) => {
  return {
    // Initial state
    columns: [],
    availableGmailLabels: [],
    isLoading: false,
    isLoadingLabels: false,
    error: null,
    isInitialized: false,

    // Load configuration from backend (with localStorage migration)
    loadConfig: async () => {
      set({ isLoading: true, error: null });

      try {
        // Fetch columns from backend
        const backendColumns = await kanbanService.getColumns();

        // If backend has columns, use them
        if (backendColumns.length > 0) {
          set({
            columns: backendColumns,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          // Backend is empty - check localStorage for migration
          const localConfig = KanbanStorage.load();

          if (localConfig && localConfig.columns.length > 0) {
            console.log('Migrating columns from localStorage to backend...');

            // Sync localStorage columns to backend
            for (const col of localConfig.columns) {
              await kanbanService.createColumn({
                title: col.title,
                status: col.status,
                gmailLabelId: col.gmailLabelId,
                gmailLabelName: col.gmailLabelName,
                color: col.color,
                icon: col.icon,
                order: col.order,
              });
            }

            // Reload from backend after sync
            const syncedColumns = await kanbanService.getColumns();
            set({
              columns: syncedColumns,
              isLoading: false,
              isInitialized: true,
            });

            // Clear localStorage (optional - keep for rollback safety)
            // KanbanStorage.clear();
          } else {
            // No local config either - backend should have created defaults
            // Reload to get defaults
            const defaultColumns = await kanbanService.getColumns();
            set({
              columns: defaultColumns.length > 0 ? defaultColumns : DEFAULT_COLUMNS,
              isLoading: false,
              isInitialized: true,
            });
          }
        }
      } catch (error: any) {
        console.error('Failed to load columns from backend:', error);

        // Fallback to localStorage if backend fails
        try {
          const localConfig = KanbanStorage.load();
          set({
            columns: localConfig?.columns || DEFAULT_COLUMNS,
            error: 'Using offline mode - failed to sync with server',
            isLoading: false,
            isInitialized: true,
          });
        } catch (fallbackError) {
          set({
            columns: DEFAULT_COLUMNS,
            error: error.message,
            isLoading: false,
            isInitialized: true,
          });
        }
      }
    },

    // Add a new column
    addColumn: async (columnInput: CreateColumnInput) => {
      const { columns } = get();

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

      try {
        // Create column via backend
        const newColumn = await kanbanService.createColumn(columnInput);

        // Update local state
        set({
          columns: [...columns, newColumn].sort((a, b) => a.order - b.order),
          error: null,
        });
      } catch (error: any) {
        console.error('Failed to create column:', error);
        set({ error: 'Failed to create column' });
      }
    },

    // Update an existing column
    updateColumn: async (id: string, updates: Partial<KanbanColumnConfig>) => {
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
        if (updates.status && updates.status !== KanbanEmailStatus.SNOOZED) {
          set({ error: "Cannot change status of Snoozed column" });
          return;
        }
        if (updates.isSystem === false) {
          set({ error: "Cannot remove system flag from Snoozed column" });
          return;
        }
      }

      try {
        // Update column via backend
        const updatedColumn = await kanbanService.updateColumn(id, updates);

        // Update local state
        set({
          columns: columns.map((col) => (col.id === id ? updatedColumn : col)),
          error: null,
        });
      } catch (error: any) {
        console.error('Failed to update column:', error);
        set({ error: 'Failed to update column' });
      }
    },

    // Delete a column
    deleteColumn: async (id: string) => {
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

      try {
        // Delete column via backend
        await kanbanService.deleteColumn(id);

        // Update local state
        set({
          columns: columns.filter((col) => col.id !== id),
          error: null,
        });
      } catch (error: any) {
        console.error('Failed to delete column:', error);
        set({ error: 'Failed to delete column' });
      }
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

      // Update local state immediately for responsive UI
      set({ columns: withNewOrder, error: null });

      // Sync with backend asynchronously
      withNewOrder.forEach(async (col) => {
        try {
          await kanbanService.updateColumn(col.id, { order: col.order });
        } catch (error) {
          console.error(`Failed to update order for column ${col.id}:`, error);
        }
      });
    },

    // Set available Gmail labels
    setGmailLabels: (labels: GmailLabel[]) => {
      set({ availableGmailLabels: labels, isLoadingLabels: false });
    },

    // Map a Gmail label to a column
    mapLabelToColumn: async (columnId: string, labelId: string, labelName: string) => {
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

      await get().updateColumn(columnId, {
        gmailLabelId: labelId,
        gmailLabelName: labelName,
      });
    },

    // Remove Gmail label mapping from a column
    unmapLabelFromColumn: async (columnId: string) => {
      await get().updateColumn(columnId, {
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
