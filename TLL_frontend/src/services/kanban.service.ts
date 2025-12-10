import apiClient from "../lib/axios";
import { API_ENDPOINTS } from "../config/constants";
import type { Email } from "../types/email.types";
import type { KanbanEmailStatusType } from "../types/kanban.types";

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
}

export const kanbanService = {
  // Get emails with Kanban metadata (status, snoozeUntil, aiSummary)
  getKanbanEmails: async (filters?: {
    folder?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ emails: KanbanEmail[]; pagination: Record<string, unknown> }> => {
    const params: Record<string, unknown> = {};
    if (filters?.folder) params.folder = filters.folder;
    if (filters?.search) params.search = filters.search;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await apiClient.get(API_ENDPOINTS.KANBAN.EMAILS, { params });
    return {
      emails: response.data.emails || [],
      pagination: response.data.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  // Update email status (for Kanban column moves)
  updateStatus: async (emailId: string, status: KanbanEmailStatusType): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.KANBAN.UPDATE_STATUS(emailId), { status });
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
};
