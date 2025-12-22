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
  }): Promise<{ emails: Email[]; pagination: Record<string, unknown> }> => {
    const params: Record<string, unknown> = {};
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
  ): Promise<{ emails: Email[]; pagination: Record<string, unknown> }> => {
    return emailService.getEmails({ ...filters, folder: folderId });
  },

  // Get single email by ID (with AI summary from kanban metadata)
  getEmailById: async (id: string): Promise<Email | null> => {
    try {
      // Use kanban endpoint to get email with aiSummary
      const response = await apiClient.get(API_ENDPOINTS.KANBAN.EMAIL_DETAIL(id));
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
      moveToFolder?: string; // New: move email to different folder
    }
  ): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.MODIFY(id), action);
  },

  // Mark email as read (legacy support)
  markAsRead: async (id: string): Promise<void> => {
    await emailService.modifyEmail(id, { markAsRead: true });
  },

  // Move email to different folder/status
  moveEmail: async (id: string, folder: string): Promise<void> => {
    await emailService.modifyEmail(id, { moveToFolder: folder });
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

  // Search emails with fuzzy matching
  searchEmails: async (
    query: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ emails: Email[]; pagination: Record<string, unknown> }> => {
    const params = { q: query, page: options?.page || 1, limit: options?.limit || 20 };
    logger.info(`[SEARCH API] Calling backend search: ${API_ENDPOINTS.EMAILS.SEARCH}`, { query, page: params.page });
    const response = await apiClient.get(API_ENDPOINTS.EMAILS.SEARCH, { params });

    // Transform search response to match Email type
    // Backend returns: { sender: "Name <email>", ... }
    // Frontend expects: { from: { name, email }, ... }
    const emails = (response.data.emails || []).map((email: any) => {
      // Parse sender string: "Name <email@example.com>" or " <email@example.com>"
      const senderMatch = email.sender?.match(/^(.*?)\s*<(.+?)>$/);
      const name = senderMatch ? senderMatch[1].trim() : "";
      const emailAddr = senderMatch ? senderMatch[2].trim() : email.sender || "";

      return {
        id: email.id,
        from: {
          name: name || emailAddr.split('@')[0], // Fallback to email username if no name
          email: emailAddr,
        },
        to: [], // Search endpoint doesn't return 'to' field
        subject: email.subject || "",
        preview: email.snippet || "",
        body: email.snippet || "", // Search only returns snippet, not full body
        date: new Date(email.date),
        read: false, // Search doesn't return read status
        starred: false, // Search doesn't return starred status
        folder: "inbox" as const, // Default folder
        labelIds: [],
        attachments: [],
        threadId: email.id,
      } as Email;
    });

    return {
      emails,
      pagination: response.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  // Semantic search with vector embeddings
  semanticSearch: async (
    query: string,
    options?: { limit?: number; minSimilarity?: number }
  ): Promise<{ emails: Email[]; pagination: Record<string, unknown> }> => {
    const params = {
      q: query,
      limit: options?.limit || 20,
      minSimilarity: options?.minSimilarity || 0.5,
    };

    logger.info(`[SEMANTIC SEARCH API] Calling backend: ${API_ENDPOINTS.SEARCH.SEMANTIC}`, { query });
    const response = await apiClient.post(API_ENDPOINTS.SEARCH.SEMANTIC, params);

    // Backend returns: SemanticSearchResult[]
    // Transform to match Email type
    const emails = (response.data || []).map((result: any) => ({
      id: result.emailId,
      from: result.from || { name: "", email: "" },
      to: result.to || [],
      subject: result.subject || "",
      preview: result.bodyPreview || "",
      body: result.bodyPreview || "",
      date: new Date(result.date),
      read: false, // Semantic search doesn't return read status
      starred: false,
      folder: "inbox" as const,
      labelIds: [],
      attachments: [],
      threadId: result.emailId,
      // Additional semantic search metadata
      similarity: result.similarity,
      source: result.source, // 'semantic' | 'keyword' | 'both'
    })) as Email[];

    return {
      emails,
      pagination: {
        total: emails.length,
        page: 1,
        limit: params.limit,
        totalPages: 1,
      },
    };
  },
};
