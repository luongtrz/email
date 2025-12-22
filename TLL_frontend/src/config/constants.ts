export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    REFRESH: '/api/auth/refresh',
    GOOGLE_LOGIN: '/api/auth/google',
    GOOGLE_AUTH_URL: '/api/auth/google/url',
    GOOGLE_CALLBACK: '/api/auth/google/callback',
    LOGOUT: '/api/auth/logout',
  },
  EMAILS: {
    MAILBOXES: '/api/mailboxes',
    EMAILS_BY_FOLDER: (folderId: string) => `/api/mailboxes/${folderId}/emails`,
    LIST: '/api/emails/list',
    SEARCH: '/api/emails/search',
    LABELS: '/api/emails/labels',
    DETAIL: (id: string) => `/api/emails/${id}`,
    MODIFY: (id: string) => `/api/emails/${id}/modify`,
    SEND: '/api/emails/send',
    REPLY: (id: string) => `/api/emails/${id}/reply`,
    FORWARD: (id: string) => `/api/emails/${id}/forward`,
    ATTACHMENT: (attachmentId: string, messageId: string) => `/api/attachments/${attachmentId}?messageId=${messageId}`,
  },
  KANBAN: {
    EMAILS: '/api/kanban/emails',
    EMAIL_DETAIL: (id: string) => `/api/kanban/emails/${id}/detail`,
    UPDATE_STATUS: (id: string) => `/api/kanban/emails/${id}/status`,
    SNOOZE: (id: string) => `/api/kanban/emails/${id}/snooze`,
    SUMMARIZE: (id: string) => `/api/kanban/emails/${id}/summarize`,
    RESTORE_SNOOZED: '/api/kanban/emails/restore-snoozed',
  },
  STUDENTS: {
    LIST: '/api/students',
    DETAIL: (id: string) => `/api/students/${id}`,
  },
} as const;

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  INBOX: '/inbox',
} as const;
