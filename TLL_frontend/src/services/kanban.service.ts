import apiClient from "../lib/axios";
import { API_ENDPOINTS } from "../config/constants";

export interface EmailSummary {
  summary: string;
}

export const kanbanService = {
  // Generate AI summary for email
  summarizeEmail: async (emailId: string, text?: string): Promise<EmailSummary> => {
    const response = await apiClient.post(API_ENDPOINTS.KANBAN.SUMMARIZE(emailId), {
      text,
    });
    return response.data;
  },
};
