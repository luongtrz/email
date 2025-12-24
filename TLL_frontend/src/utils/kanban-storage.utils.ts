import type { KanbanConfig, KanbanColumnConfig } from "../types/kanban-config.types";
import { KanbanEmailStatus } from "../types/kanban.types";

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'kanban-column-config-v1';
const CURRENT_VERSION = 1;

// Valid Kanban status enum values
const VALID_STATUSES = Object.values(KanbanEmailStatus);

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Default column configuration matching the existing hardcoded columns
 * Used for first-time users or when resetting to defaults
 */
export const DEFAULT_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "inbox",
    title: "Inbox",
    status: KanbanEmailStatus.INBOX,
    gmailLabelId: null,
    gmailLabelName: null,
    color: "#3B82F6",
    icon: "inbox",
    order: 0,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "todo",
    title: "To Do",
    status: KanbanEmailStatus.TODO,
    gmailLabelId: null,
    gmailLabelName: null,
    color: "#F59E0B",
    icon: "clipboard-list",
    order: 1,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "in-progress",
    title: "In Progress",
    status: KanbanEmailStatus.IN_PROGRESS,
    gmailLabelId: null,
    gmailLabelName: null,
    color: "#10B981",
    icon: "clock",
    order: 2,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "done",
    title: "Done",
    status: KanbanEmailStatus.DONE,
    gmailLabelId: null,
    gmailLabelName: null,
    color: "#8B5CF6",
    icon: "check-circle",
    order: 3,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "snoozed",
    title: "Snoozed",
    status: KanbanEmailStatus.SNOOZED,
    gmailLabelId: null,
    gmailLabelName: null,
    color: "#6B7280",
    icon: "moon",
    order: 4,
    isSystem: true, // Cannot be deleted
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate that a config object has the correct structure
 */
function validateConfig(config: any): config is KanbanConfig {
  if (!config || typeof config !== 'object') {
    console.error('Invalid config: not an object');
    return false;
  }

  if (typeof config.version !== 'number' || config.version !== CURRENT_VERSION) {
    console.error(`Invalid config version: expected ${CURRENT_VERSION}, got ${config.version}`);
    return false;
  }

  if (!Array.isArray(config.columns)) {
    console.error('Invalid config: columns is not an array');
    return false;
  }

  // Validate each column
  for (const column of config.columns) {
    if (!validateColumn(column)) {
      return false;
    }
  }

  // Ensure Snoozed column exists and is marked as system
  const snoozedColumn = config.columns.find(
    (col: any) => col.status === 'SNOOZED'
  );
  if (!snoozedColumn) {
    console.error('Invalid config: missing Snoozed column');
    return false;
  }
  if (!snoozedColumn.isSystem) {
    console.error('Invalid config: Snoozed column must be system');
    return false;
  }

  // Check for duplicate status names (case-insensitive)
  const statusMap = new Map<string, string>();
  for (const column of config.columns) {
    const normalizedStatus = column.status.toUpperCase();
    if (statusMap.has(normalizedStatus)) {
      console.error(`Duplicate status "${column.status}" found in columns`);
      return false;
    }
    statusMap.set(normalizedStatus, column.id);
  }

  return true;
}

/**
 * Validate a single column configuration
 */
function validateColumn(column: any): boolean {
  if (!column || typeof column !== 'object') {
    console.error('Invalid column: not an object');
    return false;
  }

  const required = ['id', 'title', 'status', 'color', 'icon', 'order', 'isSystem'];
  for (const field of required) {
    if (!(field in column)) {
      console.error(`Invalid column: missing required field "${field}"`);
      return false;
    }
  }

  if (typeof column.id !== 'string' || column.id.length === 0) {
    console.error('Invalid column: id must be a non-empty string');
    return false;
  }

  if (typeof column.title !== 'string' || column.title.length === 0) {
    console.error('Invalid column: title must be a non-empty string');
    return false;
  }

  if (typeof column.status !== 'string' || column.status.trim().length === 0) {
    console.error('Invalid column: status must be a non-empty string');
    return false;
  }

  // Validate SNOOZED is system
  if (column.status === 'SNOOZED' && !column.isSystem) {
    console.error('Invalid column: SNOOZED must be system column');
    return false;
  }

  if (typeof column.order !== 'number' || column.order < 0) {
    console.error('Invalid column: order must be a non-negative number');
    return false;
  }

  if (typeof column.isSystem !== 'boolean') {
    console.error('Invalid column: isSystem must be a boolean');
    return false;
  }

  // gmailLabelId and gmailLabelName can be null or string
  if (column.gmailLabelId !== null && typeof column.gmailLabelId !== 'string') {
    console.error('Invalid column: gmailLabelId must be null or string');
    return false;
  }

  if (column.gmailLabelName !== null && typeof column.gmailLabelName !== 'string') {
    console.error('Invalid column: gmailLabelName must be null or string');
    return false;
  }

  return true;
}

// ============================================
// LOCALSTORAGE OPERATIONS
// ============================================

/**
 * LocalStorage utility object for Kanban column configuration
 */
export const KanbanStorage = {
  STORAGE_KEY,

  /**
   * Load configuration from LocalStorage
   * Returns null if not found or invalid
   */
  load(): KanbanConfig | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        console.log('No Kanban config found in LocalStorage');
        return null;
      }

      const config = JSON.parse(data);

      if (!validateConfig(config)) {
        console.error('Invalid Kanban config in LocalStorage, ignoring');
        return null;
      }

      console.log('Loaded Kanban config from LocalStorage', config);
      return config;
    } catch (error) {
      console.error('Failed to load Kanban config from LocalStorage:', error);
      return null;
    }
  },

  /**
   * Save configuration to LocalStorage
   * Throws error if quota exceeded
   */
  save(config: KanbanConfig): void {
    try {
      if (!validateConfig(config)) {
        throw new Error('Cannot save invalid config');
      }

      const data = JSON.stringify(config);
      localStorage.setItem(STORAGE_KEY, data);
      console.log('Saved Kanban config to LocalStorage');
    } catch (error: any) {
      if (error?.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded');
        throw new Error('Storage quota exceeded. Please delete some columns.');
      }
      console.error('Failed to save Kanban config:', error);
      throw new Error('Failed to save configuration');
    }
  },

  /**
   * Clear configuration from LocalStorage
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared Kanban config from LocalStorage');
    } catch (error) {
      console.error('Failed to clear Kanban config:', error);
    }
  },

  /**
   * Get default configuration
   */
  getDefaults(): KanbanConfig {
    return {
      version: CURRENT_VERSION,
      columns: DEFAULT_COLUMNS,
      lastModified: new Date().toISOString(),
    };
  },

  /**
   * Check if LocalStorage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};
