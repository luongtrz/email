import type { Email, Folder } from "../types/email.types";
import apiClient from "../lib/axios";
import { API_ENDPOINTS } from "../config/constants";
import { logger } from "../lib/logger";

// Real API integration
export const emailService = {
  // Get all mailboxes with counts
  getMailboxes: async (): Promise<Folder[]> => {
    const response = await apiClient.get(API_ENDPOINTS.EMAILS.MAILBOXES);
    // Backend returns array directly
    return response.data;
  },

  // Get emails with filters
  getEmails: async (filters?: {
    folder?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ emails: Email[]; pagination: any }> => {
    const params: any = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    let response;
    if (filters?.folder) {
      // Use folder-specific endpoint
      response = await apiClient.get(
        API_ENDPOINTS.EMAILS.EMAILS_BY_FOLDER(filters.folder),
        { params }
      );
    } else {
      // Use general list endpoint
      response = await apiClient.get(API_ENDPOINTS.EMAILS.LIST, { params });
    }

    // Backend returns { emails: [], pagination: {} }
    return {
      emails: response.data.emails || [],
      pagination: response.data.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  // Get emails by folder (alias for backwards compatibility)
  getEmailsByFolder: async (
    folderId: string,
    filters?: { search?: string; page?: number; limit?: number }
  ): Promise<{ emails: Email[]; pagination: any }> => {
    return emailService.getEmails({ ...filters, folder: folderId });
  },

  // Get single email by ID
  getEmailById: async (id: string): Promise<Email | null> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMAILS.DETAIL(id));
      return response.data;
    } catch (error) {
      logger.error("Failed to fetch email", error, { emailId: id });
      return null;
    }
  },

  // Modify email (mark read/unread, star, archive, delete)
  modifyEmail: async (
    id: string,
    action: {
      markAsRead?: boolean;
      markUnread?: boolean;
      star?: boolean;
      unstar?: boolean;
      archive?: boolean;
      delete?: boolean;
    }
  ): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.MODIFY(id), action);
  },

  // Mark email as read (legacy support)
  markAsRead: async (id: string): Promise<void> => {
    await emailService.modifyEmail(id, { markAsRead: true });
  },

  // Toggle starred (legacy support)
  toggleStar: async (id: string): Promise<void> => {
    // Note: Backend modify endpoint handles toggle automatically
    await emailService.modifyEmail(id, { star: true });
  },

  // Send email
  sendEmail: async (data: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.SEND, data);
  },

  // Reply to an email
  replyEmail: async (
    emailId: string,
    data: {
      body: string;
      cc?: string[];
      bcc?: string[];
      replyAll?: boolean;
    }
  ): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.REPLY(emailId), data);
  },

  // Forward an email
  forwardEmail: async (
    emailId: string,
    data: {
      to: string[];
      body?: string;
      cc?: string[];
      bcc?: string[];
    }
  ): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.FORWARD(emailId), data);
  },

  // Download attachment
  downloadAttachment: async (
    messageId: string,
    attachmentId: string
  ): Promise<Blob> => {
    const response = await apiClient.get(
      API_ENDPOINTS.EMAILS.ATTACHMENT(attachmentId, messageId),
      { responseType: "blob" }
    );
    return response.data;
  },
};
