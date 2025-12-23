import apiClient from "../lib/axios";
import { API_ENDPOINTS } from "../config/constants";
import type { Email } from "../types/email.types";
import type { KanbanEmailStatusType } from "../types/kanban.types";
import type { KanbanColumnConfig, CreateColumnInput, UpdateColumnInput } from "../types/kanban-config.types";

export interface EmailSummary {
  summary: string;
}

export interface RestoreSnoozedResponse {
  restored: number;
}

export interface SnoozeEmailRequest {
  until: string; // ISO date string
}

export interface SnoozeEmailResponse {
  emailId: string;
  status: string;
  snoozeUntil: string;
  previousStatus: string | null;
}

export interface KanbanEmail extends Email {
  status: KanbanEmailStatusType;
  aiSummary: string | null;
  snoozeUntil: string | null;
}

export interface UpdateStatusRequest {
  status: KanbanEmailStatusType;
  gmailLabelId?: string | null;
}

export const kanbanService = {
  // Get emails with Kanban metadata (status, snoozeUntil, aiSummary)
  getKanbanEmails: async (filters?: {
    columnId?: string;
    status?: KanbanEmailStatusType;
    isUnread?: boolean;
    hasAttachment?: boolean;
    from?: string;
    sort?: "date_desc" | "date_asc" | "sender_asc";
    page?: number;
    limit?: number;
  }): Promise<{ emails: KanbanEmail[]; pagination: Record<string, unknown> }> => {
    const params: Record<string, unknown> = {};

    // Prefer columnId if provided (new method), otherwise use status (backward compatibility)
    if (filters?.columnId) params.columnId = filters.columnId;
    else if (filters?.status) params.status = filters.status;

    // Optional filters
    if (filters?.isUnread !== undefined) params.isUnread = filters.isUnread;
    if (filters?.hasAttachment !== undefined) params.hasAttachment = filters.hasAttachment;
    if (filters?.from) params.from = filters.from;
    if (filters?.sort) params.sort = filters.sort;

    // Pagination: backend uses offset/limit, not page/limit
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.page) {
      const limit = filters.limit || 20;
      params.offset = (filters.page - 1) * limit;
    }

    const response = await apiClient.get(API_ENDPOINTS.KANBAN.EMAILS, { params });

    // Backend returns { items: [], total: number }
    // Transform to match frontend expectation: { emails: [], pagination: {...} }
    const items = response.data.items || [];
    const total = response.data.total || 0;
    const limit = filters?.limit || 20;
    const page = filters?.page || 1;

    return {
      emails: items.map((item: any) => ({
        id: item.emailId,
        from: {
          name: item.sender.split('<')[0].trim() || 'Unknown',
          email: item.sender.match(/<(.+)>/)?.[1] || item.sender,
          avatar: undefined,
        },
        to: [],
        subject: item.subject,
        preview: item.snippet,
        body: item.snippet, // Use snippet as body initially
        date: new Date(item.date),
        read: !item.isUnread,
        starred: false, // Backend doesn't return this yet
        folder: 'inbox', // Default folder
        attachments: item.hasAttachment ? [] : undefined,
        status: item.status,
        aiSummary: item.aiSummary,
        snoozeUntil: item.snoozeUntil,
      })),
      pagination: {
        total,
        page,
        limit,
        pageSize: limit,
        hasMore: (page * limit) < total,
      },
    };
  },

  // Update email status (for Kanban column moves)
  // Now uses columnId instead of status
  updateStatus: async (
    emailId: string,
    columnId: string,
    gmailLabelId?: string | null,
    previousGmailLabelId?: string | null
  ): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.KANBAN.UPDATE_STATUS(emailId), {
      columnId,
      gmailLabelId,
      previousGmailLabelId,
    });
  },

  // Generate AI summary for email
  summarizeEmail: async (emailId: string, text?: string): Promise<EmailSummary> => {
    const response = await apiClient.post(API_ENDPOINTS.KANBAN.SUMMARIZE(emailId), {
      text,
    });
    return response.data;
  },

  // Snooze an email until a specific time
  snoozeEmail: async (emailId: string, until: Date): Promise<SnoozeEmailResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.KANBAN.SNOOZE(emailId), {
      until: until.toISOString(),
    });
    return response.data;
  },

  // Restore snoozed emails that are due
  restoreSnoozed: async (): Promise<RestoreSnoozedResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.KANBAN.RESTORE_SNOOZED);
    return response.data;
  },

  // Get user columns from backend
  getColumns: async (): Promise<KanbanColumnConfig[]> => {
    const response = await apiClient.get('/api/kanban/columns');
    return response.data;
  },

  // Create column
  createColumn: async (column: CreateColumnInput): Promise<KanbanColumnConfig> => {
    // Explicitly destructure to exclude isSystem (runtime protection)
    const { title, status, gmailLabelId, gmailLabelName, color, icon, order } = column;
    const payload = { title, status, gmailLabelId, gmailLabelName, color, icon, order };
    const response = await apiClient.post('/api/kanban/columns', payload);
    return response.data;
  },

  // Update column
  updateColumn: async (columnId: string, updates: UpdateColumnInput): Promise<KanbanColumnConfig> => {
    const response = await apiClient.patch(`/api/kanban/columns/${columnId}`, updates);
    return response.data;
  },

  // Delete column
  deleteColumn: async (columnId: string): Promise<void> => {
    await apiClient.delete(`/api/kanban/columns/${columnId}`);
  },
};
