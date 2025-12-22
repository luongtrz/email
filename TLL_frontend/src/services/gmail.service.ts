import type { GmailLabel } from "../types/kanban-config.types";
import { apiClient } from "../lib/axios";
import { API_ENDPOINTS } from "../config/constants";

/**
 * Gmail API service for fetching labels
 */
export const gmailService = {
  /**
   * Fetch all Gmail labels for the authenticated user
   * Used for populating the label selector in column configuration
   */
  getLabels: async (): Promise<GmailLabel[]> => {
    const response = await apiClient.get<GmailLabel[]>(API_ENDPOINTS.EMAILS.LABELS);
    return response.data;
  },
};
