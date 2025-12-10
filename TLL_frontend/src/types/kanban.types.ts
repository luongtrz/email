import type { Email } from "./email.types";

// ============================================
// BACKEND STATUS ENUM (must match backend)
// ============================================

/**
 * KanbanEmailStatus enum values from backend
 * @see TLL_backend/src/database/entities/email-metadata.entity.ts
 */
export const KanbanEmailStatus = {
  INBOX: "INBOX",
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  SNOOZED: "SNOOZED",
} as const;

export type KanbanEmailStatusType = typeof KanbanEmailStatus[keyof typeof KanbanEmailStatus];

// ============================================
// FRONTEND TYPES
// ============================================

export interface KanbanColumn {
  id: string;
  title: string;
  status: KanbanEmailStatusType; // Backend status value
  color?: string;
  icon?: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  email: Email;
  columnId: string;
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "inbox",
    title: "Inbox",
    status: KanbanEmailStatus.INBOX,
    color: "#3B82F6",
    icon: "inbox",
    order: 0,
  },
  {
    id: "todo",
    title: "To Do",
    status: KanbanEmailStatus.TODO,
    color: "#F59E0B",
    icon: "clipboard-list",
    order: 1,
  },
  {
    id: "in-progress",
    title: "In Progress",
    status: KanbanEmailStatus.IN_PROGRESS,
    color: "#10B981",
    icon: "clock",
    order: 2,
  },
  {
    id: "done",
    title: "Done",
    status: KanbanEmailStatus.DONE,
    color: "#8B5CF6",
    icon: "check-circle",
    order: 3,
  },
  {
    id: "snoozed",
    title: "Snoozed",
    status: KanbanEmailStatus.SNOOZED,
    color: "#6B7280",
    icon: "moon",
    order: 4,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create Kanban cards from emails
 * Maps email status (from Kanban API) to column
 */
export const createCardsFromEmails = (
  emails: Email[],
  columns: KanbanColumn[]
): KanbanCard[] => {
  return emails.map((email) => {
    // Get status from Kanban metadata
    const emailStatus = (email as any).status as KanbanEmailStatusType | undefined;
    
    // Find matching column by status
    const column = emailStatus
      ? columns.find((col) => col.status === emailStatus)
      : columns.find((col) => col.status === KanbanEmailStatus.INBOX); // Default to INBOX
    
    return {
      id: email.id,
      email,
      columnId: column?.id || "inbox",
    };
  });
};
