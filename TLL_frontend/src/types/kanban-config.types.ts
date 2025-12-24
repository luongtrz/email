import type { KanbanEmailStatusType } from "./kanban.types";

// ============================================
// KANBAN COLUMN CONFIGURATION TYPES
// ============================================

/**
 * Enhanced Kanban column configuration with Gmail label mapping
 * Extends the basic KanbanColumn with additional fields for persistence and label sync
 */
export interface KanbanColumnConfig {
  id: string;                      // Unique identifier (UUID generated client-side)
  title: string;                   // Display name (e.g., "Inbox", "Urgent", "Waiting for Reply")
  status: KanbanEmailStatusType;   // Custom status string (e.g., INBOX, TODO, URGENT, WAITING_FOR_REPLY)
  gmailLabelId: string | null;     // Gmail label ID (e.g., "Label_123")
  gmailLabelName: string | null;   // Gmail label name for display
  color: string;                   // Hex color for column indicator
  icon: string;                    // Icon identifier
  order: number;                   // Display order (0-indexed)
  isSystem: boolean;               // If true, cannot be deleted or modified (SNOOZED is the only system column)
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}

/**
 * LocalStorage configuration structure
 * Stores custom column configurations with versioning for future migrations
 */
export interface KanbanConfig {
  version: number;                 // Schema version (currently 1)
  columns: KanbanColumnConfig[];   // Array of column configurations
  lastModified: string;            // ISO timestamp of last modification
}

/**
 * Gmail label interface (from Gmail API)
 */
export interface GmailLabel {
  id: string;                      // Gmail's label ID
  name: string;                    // Label display name
  type: string;                    // "system" or "user"
  messageListVisibility?: string;  // "show" or "hide"
  labelListVisibility?: string;    // "labelShow" or "labelHide"
  color?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Partial column for creation (omits auto-generated fields)
 */
export type CreateColumnInput = Omit<
  KanbanColumnConfig,
  'id' | 'createdAt' | 'updatedAt' | 'isSystem'
>;

/**
 * Partial column for updates
 */
export type UpdateColumnInput = Partial<
  Omit<KanbanColumnConfig, 'id' | 'createdAt' | 'updatedAt'>
>;
