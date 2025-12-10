import type { Email } from "./email.types";

export interface KanbanColumn {
  id: string;
  title: string;
  emailFolder: string; // Maps to email folder/status
  color?: string;
  icon?: string;
  order: number;
  isDefault: boolean;
}

export interface KanbanCard {
  id: string;
  email: Email;
  columnId: string;
}

// Default columns configuration
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "inbox",
    title: "Inbox",
    emailFolder: "inbox",
    color: "#3B82F6", // blue
    icon: "inbox",
    order: 0,
    isDefault: true,
  },
  {
    id: "todo",
    title: "To Do",
    emailFolder: "todo",
    color: "#F59E0B", // amber
    icon: "clipboard-list",
    order: 1,
    isDefault: true,
  },
  {
    id: "in-progress",
    title: "In Progress",
    emailFolder: "in-progress",
    color: "#10B981", // emerald
    icon: "clock",
    order: 2,
    isDefault: true,
  },
  {
    id: "done",
    title: "Done",
    emailFolder: "done",
    color: "#8B5CF6", // violet
    icon: "check-circle",
    order: 3,
    isDefault: true,
  },
  {
    id: "snoozed",
    title: "Snoozed",
    emailFolder: "snoozed",
    color: "#6B7280", // gray
    icon: "moon",
    order: 4,
    isDefault: true,
  },
];

// Helper function to get column by email folder
export const getColumnByFolder = (
  columns: KanbanColumn[],
  folder: string
): KanbanColumn | undefined => {
  return columns.find((col) => col.emailFolder === folder);
};

// Helper function to get emails for a specific column
export const getEmailsForColumn = (
  emails: Email[],
  column: KanbanColumn
): Email[] => {
  return emails.filter((email) => email.folder === column.emailFolder);
};

// Helper function to create cards from emails
export const createCardsFromEmails = (
  emails: Email[],
  columns: KanbanColumn[]
): KanbanCard[] => {
  return emails.map((email) => {
    const column = getColumnByFolder(columns, email.folder);
    return {
      id: email.id,
      email,
      columnId: column?.id || "inbox",
    };
  });
};
