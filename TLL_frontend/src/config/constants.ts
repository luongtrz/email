export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    REFRESH: '/api/auth/refresh',
    GOOGLE_LOGIN: '/api/auth/google',
  },
  EMAILS: {
    MAILBOXES: '/api/emails/mailboxes',
    EMAILS_BY_FOLDER: (folderId: string) => `/api/emails/mailboxes/${folderId}/emails`,
    LIST: '/api/emails/list',
    DETAIL: (id: string) => `/api/emails/${id}`,
    MARK_READ: (id: string) => `/api/emails/${id}/read`,
    TOGGLE_STAR: (id: string) => `/api/emails/${id}/star`,
    SEED: '/api/emails/seed',
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

export const TOKEN_KEY = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
} as const;
