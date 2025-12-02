# API Integration Guide

## Overview
This document describes how the frontend integrates with the NestJS backend API.

## Base Configuration

### Axios Instance
**File:** `src/lib/axios.ts`

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,  // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptor
Automatically attaches access token to all requests:

```typescript
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

### Response Interceptor
Handles token refresh on 401 errors:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Refresh token logic
      const newToken = await authService.refreshToken();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    }
  }
);
```

## Authentication Service

### Register
```typescript
interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
}

const register = async (data: RegisterDto): Promise<User> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data.data;
};
```

### Login
```typescript
interface LoginDto {
  email: string;
  password: string;
}

const login = async (credentials: LoginDto): Promise<LoginResponse> => {
  const response = await apiClient.post('/auth/login', credentials);
  
  // Backend sets httpOnly cookies automatically
  // Frontend stores access token in memory
  const { accessToken, user } = response.data.data;
  return { accessToken, user };
};
```

### Refresh Token
```typescript
const refreshToken = async (): Promise<string> => {
  const response = await apiClient.post('/auth/refresh');
  return response.data.data.accessToken;
};
```

### Get Profile
```typescript
const getProfile = async (): Promise<User> => {
  const response = await apiClient.get('/auth/profile');
  return response.data.data;
};
```

### Google OAuth
```typescript
// Step 1: Get authorization URL
const getGoogleAuthUrl = async (): Promise<{ authUrl: string }> => {
  const response = await apiClient.get('/auth/google/url');
  return response.data.data;
};

// Step 2: Backend handles callback automatically
// Frontend polls profile to detect connection
const checkGmailConnection = async (): Promise<boolean> => {
  const user = await getProfile();
  return !!user.gmailAddress;
};
```

## Email Service

### Get Mailboxes
```typescript
interface Folder {
  id: string;
  name: string;
  count: number;
  unreadCount: number;
}

const getMailboxes = async (): Promise<Folder[]> => {
  const response = await apiClient.get('/emails/mailboxes');
  return response.data.data;
};
```

### List Emails
```typescript
interface GetEmailsParams {
  folder?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface EmailListResponse {
  emails: Email[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    nextPageToken?: string;
  };
}

const getEmails = async (params?: GetEmailsParams): Promise<EmailListResponse> => {
  const queryParams: any = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;

  let endpoint = '/emails';
  if (params?.folder) {
    endpoint = `/emails/folder/${params.folder}`;
  }

  const response = await apiClient.get(endpoint, { params: queryParams });
  return {
    emails: response.data.data.emails || [],
    pagination: response.data.data.pagination || { 
      total: 0, page: 1, limit: 20, totalPages: 0 
    },
  };
};
```

### Get Email Detail
```typescript
const getEmailById = async (emailId: string): Promise<Email> => {
  const response = await apiClient.get(`/emails/${emailId}`);
  return response.data.data;
};
```

### Send Email
```typescript
interface SendEmailDto {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

const sendEmail = async (data: SendEmailDto): Promise<void> => {
  await apiClient.post('/emails/send', data);
};
```

### Mark as Read
```typescript
const markAsRead = async (emailId: string, read: boolean = true): Promise<void> => {
  await apiClient.patch(`/emails/${emailId}/read`, { markAsRead: read });
};
```

### Star Email
```typescript
const starEmail = async (emailId: string, starred: boolean): Promise<void> => {
  await apiClient.patch(`/emails/${emailId}/star`, { starred });
};
```

### Archive Email
```typescript
const archiveEmail = async (emailId: string): Promise<void> => {
  await apiClient.patch(`/emails/${emailId}/archive`);
};
```

### Delete Email
```typescript
const deleteEmail = async (emailId: string): Promise<void> => {
  await apiClient.delete(`/emails/${emailId}`);
};
```

### Download Attachment
```typescript
const downloadAttachment = async (
  emailId: string, 
  attachmentId: string
): Promise<Blob> => {
  const response = await apiClient.get(
    `/emails/${emailId}/attachments/${attachmentId}`,
    { responseType: 'blob' }
  );
  return response.data;
};
```

## Error Handling Patterns

### Standard Error Response
```typescript
interface ApiError {
  message: string;
  code: number;
  errors?: unknown;
}

try {
  await emailService.sendEmail(data);
} catch (error: any) {
  const apiError = error.response?.data as ApiError;
  toast.error(apiError.message || 'Something went wrong');
}
```

### Gmail Not Connected
```typescript
try {
  const emails = await emailService.getEmails();
} catch (error: any) {
  if (error.response?.status === 401) {
    if (error.response.data.message?.includes('Gmail account not connected')) {
      // Show OAuth connection prompt
      setGmailNotConnected(true);
    } else {
      // Invalid JWT, force logout
      logout();
      navigate('/login');
    }
  }
}
```

### Network Errors
```typescript
try {
  await apiClient.get('/emails');
} catch (error: any) {
  if (!error.response) {
    // Network error (backend down)
    toast.error('Cannot connect to server. Please try again later.');
  }
}
```

## Request Queue Pattern

When multiple requests fail with 401 simultaneously:

```typescript
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// First 401: Start refresh
if (!isRefreshing) {
  isRefreshing = true;
  
  try {
    const newToken = await authService.refreshToken();
    // Process all queued requests
    failedQueue.forEach(prom => prom.resolve(newToken));
  } catch (err) {
    failedQueue.forEach(prom => prom.reject(err));
  } finally {
    isRefreshing = false;
    failedQueue = [];
  }
}

// Subsequent 401s: Add to queue
return new Promise((resolve, reject) => {
  failedQueue.push({ resolve, reject });
}).then(token => {
  originalRequest.headers.Authorization = `Bearer ${token}`;
  return apiClient(originalRequest);
});
```

## Response Data Extraction

Backend returns consistent format:
```typescript
{
  message: string;
  code: number;
  data: T;        // Actual payload
  meta?: {...};   // Pagination info
}
```

Always access data via `.data.data`:
```typescript
const response = await apiClient.get('/emails');
const emails = response.data.data.emails;  // ✅ Correct
const pagination = response.data.data.pagination;
```

## CORS Configuration

Frontend must match backend's CORS settings:

**Backend `.env`:**
```env
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

**Frontend Axios:**
```typescript
withCredentials: true  // Required for cookies
```

## Testing API Integration

### Manual Testing
1. Open DevTools → Network tab
2. Perform action (login, fetch emails)
3. Verify:
   - Request URL correct
   - Authorization header present
   - Response status 200
   - Response data structure matches expected

### Common Debugging
```typescript
// Log all requests
apiClient.interceptors.request.use(config => {
  console.log('🚀 Request:', config.method?.toUpperCase(), config.url);
  return config;
});

// Log all responses
apiClient.interceptors.response.use(
  response => {
    console.log('✅ Response:', response.config.url, response.data);
    return response;
  },
  error => {
    console.error('❌ Error:', error.config?.url, error.response?.data);
    return Promise.reject(error);
  }
);
```

## Rate Limiting Considerations

Backend may implement rate limiting. Frontend should:

1. **Debounce search inputs:**
```typescript
const [searchQuery, setSearchQuery] = useState('');

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    loadEmails({ search: query });
  }, 500),
  []
);
```

2. **Prevent duplicate requests:**
```typescript
const [isLoading, setIsLoading] = useState(false);

const loadEmails = async () => {
  if (isLoading) return;  // Prevent duplicate calls
  setIsLoading(true);
  // ... fetch logic
  setIsLoading(false);
};
```

3. **Handle 429 errors:**
```typescript
if (error.response?.status === 429) {
  toast.error('Too many requests. Please wait a moment.');
}
```

## WebSocket Integration (Future)

For real-time email notifications:

```typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/emails/live');

ws.onmessage = (event) => {
  const newEmail = JSON.parse(event.data);
  setEmails(prev => [newEmail, ...prev]);
  toast('New email received!');
};

// Cleanup
ws.close();
```
