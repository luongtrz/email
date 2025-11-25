import type { Email, Folder } from '../types/email.types';
import apiClient from '../lib/axios';
import { API_ENDPOINTS } from '../config/constants';

// Real API integration
export const emailService = {
  // Get all mailboxes with counts
  getMailboxes: async (): Promise<Folder[]> => {
    const response = await apiClient.get(API_ENDPOINTS.EMAILS.MAILBOXES);
    return response.data;
  },

  // Get emails with filters
  getEmails: async (filters?: { folder?: string; search?: string; page?: number; limit?: number }): Promise<Email[]> => {
    const params = new URLSearchParams();
    if (filters?.folder) params.append('folder', filters.folder);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`${API_ENDPOINTS.EMAILS.LIST}?${params}`);
    return response.data.emails || response.data;
  },

  // Get emails by folder
  getEmailsByFolder: async (folderId: string, filters?: { search?: string; page?: number; limit?: number }): Promise<Email[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`${API_ENDPOINTS.EMAILS.EMAILS_BY_FOLDER(folderId)}?${params}`);
    return response.data.emails || response.data;
  },

  // Get single email by ID
  getEmailById: async (id: string): Promise<Email | null> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMAILS.DETAIL(id));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch email:', error);
      return null;
    }
  },

  // Mark email as read
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.MARK_READ(id));
  },

  // Toggle starred
  toggleStar: async (id: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.TOGGLE_STAR(id));
  },

  // Seed mock data (for demo)
  seedMockData: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.EMAILS.SEED);
  },
};
