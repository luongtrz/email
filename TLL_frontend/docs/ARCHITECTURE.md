# Frontend Architecture Documentation

## Tech Stack
- **Framework:** React 19.2 with TypeScript 5.9
- **Build Tool:** Vite 7.2.2
- **Routing:** React Router DOM 7.1.1
- **State Management:** Zustand 5.0.8
- **HTTP Client:** Axios 1.13.2
- **UI Library:** TailwindCSS 3.4.1
- **Icons:** Lucide React 0.468.0
- **Notifications:** React Hot Toast 2.4.1

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ProtectedRoute.tsx    # Auth guard wrapper
│   ├── PublicRoute.tsx       # Redirect if logged in
│   └── email/                # Email-specific components
│       ├── ComposeModal.tsx  # Email compose dialog
│       ├── EmailDetail.tsx   # Email content viewer
│       ├── EmailList.tsx     # Email list with pagination
│       ├── EmailListSkeleton.tsx  # Loading state
│       └── FolderList.tsx    # Mailbox sidebar
├── config/
│   └── constants.ts     # API endpoints & app config
├── contexts/
│   └── AuthContext.tsx  # React Context for auth state
├── lib/
│   └── axios.ts         # Axios instance with interceptors
├── pages/               # Route components
│   ├── DashboardPage.tsx     # Main email dashboard
│   ├── InboxPage.tsx         # Legacy inbox page
│   ├── LoginPage.tsx         # Login form
│   └── RegisterPage.tsx      # Registration form
├── services/            # API service layer
│   ├── auth.service.ts       # Auth API calls
│   └── email.service.ts      # Email API calls
├── store/
│   └── auth.store.ts    # Zustand auth store
├── types/               # TypeScript definitions
│   ├── auth.types.ts         # Auth interfaces
│   └── email.types.ts        # Email interfaces
├── App.tsx              # Root component with router
└── main.tsx             # Entry point
```

## Key Design Patterns

### 1. Authentication Flow

**Token Storage Strategy:**
- **Access Token** → Zustand memory store (cleared on refresh)
- **Refresh Token** → httpOnly cookie (managed by backend)
- **Google Tokens** → Never exposed to frontend

**Login Sequence:**
```typescript
// 1. User submits credentials
await authService.login(email, password);

// 2. Backend sets httpOnly cookies for access/refresh tokens
// 3. Frontend stores access token in Zustand memory
setAccessToken(response.data.accessToken);

// 4. Axios interceptors auto-attach token to requests
```

**Token Refresh with Request Queue:**
```typescript
// Axios Response Interceptor
if (error.response?.status === 401 && !originalRequest._retry) {
  if (!isRefreshing) {
    isRefreshing = true;
    const newToken = await authService.refreshToken();
    
    // Process queued requests with new token
    failedQueue.forEach(prom => prom.resolve(newToken));
  } else {
    // Queue request until refresh completes
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }
}
```

### 2. Gmail OAuth Integration

**Authorization Flow:**
```typescript
// 1. Backend generates OAuth URL
const { authUrl } = await authService.getGoogleAuthUrl();

// 2. Open URL in new window
window.open(authUrl, '_blank');

// 3. Backend handles callback and stores tokens
// 4. Frontend polls /auth/profile to detect connection
```

**Connection Status:**
```typescript
interface User {
  gmailAddress?: string;      // Set after OAuth
  googleTokenExpiry?: string; // Token expiration
}
```

### 3. Email List UI Pattern

**Gmail-Compact Design:**
- Single-line rows: `Sender (140px) | Subject + Preview (flex-1) | Date (64px)`
- Truncation: `truncate` class on flex items
- Hover effects: Checkbox appears on hover via `opacity-0 group-hover:opacity-100`

**Resizable Panel:**
```typescript
const [emailListWidth, setEmailListWidth] = useState(448); // 300-800px

const handleMouseMove = (e: MouseEvent) => {
  const newWidth = e.clientX - sidebarWidth;
  if (newWidth >= 300 && newWidth <= 800) {
    setEmailListWidth(newWidth);
  }
};
```

**Pagination Pattern:**
```typescript
// Simple increment - backend handles page logic
const loadMoreEmails = async () => {
  const nextPage = pagination.page + 1;
  const result = await emailService.getEmails({ page: nextPage });
  
  if (result.emails.length > 0) {
    setEmails(prev => [...prev, ...result.emails]); // Append
    toast.success(`Loaded ${result.emails.length} more emails`);
  } else {
    toast('No more emails to load');
  }
};
```

### 4. Optimistic Updates

**Mark as Read Pattern:**
```typescript
const handleEmailSelect = async (emailId: string) => {
  // 1. Update UI immediately
  setEmails(prev => prev.map(e => 
    e.id === emailId ? { ...e, read: true } : e
  ));
  
  try {
    // 2. Sync with backend
    await emailService.markAsRead(emailId);
  } catch (error) {
    // 3. Rollback on error
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, read: false } : e
    ));
  }
};
```

### 5. Loading States

**Skeleton Loader:**
```typescript
// Match exact heights to prevent scroll jump
<EmailListSkeleton /> // 20 items × 68px = 1360px
```

**Conditional Rendering:**
```typescript
{isLoading ? (
  <EmailListSkeleton />
) : emails.length === 0 ? (
  <EmptyState />
) : (
  <EmailList emails={emails} />
)}
```

## Component API Contracts

### EmailList Props
```typescript
interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  selectedEmails?: Set<string>;
  onEmailToggle?: (emailId: string, checked: boolean) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}
```

### EmailDetail Props
```typescript
interface EmailDetailProps {
  email: Email | null;
  onClose: () => void;
  onEmailUpdated: () => void;
}
```

## Styling Conventions

### TailwindCSS Patterns
```typescript
// Truncation with ellipsis
className="truncate"

// Forced light mode for email content (override sender HTML)
className="[&_*]:!text-gray-800 [&_*]:!bg-transparent"

// Centered flex container
className="flex flex-col items-center"

// Resizable cursor during drag
className={`${isResizing ? 'cursor-col-resize select-none' : ''}`}
```

### Mobile Responsive
```typescript
// Desktop 3-column → Mobile stack
className="hidden lg:flex"  // Desktop only
className="lg:hidden"       // Mobile only

// Floating action button
className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full"
```

## Error Handling

### Toast Notifications
```typescript
import toast from 'react-hot-toast';

toast.success('Email sent successfully');
toast.error('Failed to send email');
toast('No more emails to load');  // Default style
```

### API Error Responses
```typescript
try {
  await emailService.sendEmail(data);
} catch (error: any) {
  if (error.response?.status === 401) {
    // Gmail not connected
    navigate('/'); // Redirect to connect
  } else {
    toast.error(error.response?.data?.message || 'Something went wrong');
  }
}
```

## Performance Optimizations

1. **Lazy Loading:** EmailDetail only renders when email selected
2. **Memoization:** useCallback for event handlers to prevent re-renders
3. **Pagination:** Load 20 emails at a time instead of all
4. **Skeleton Loaders:** Prevent layout shift during loading
5. **Cleanup:** useEffect cleanup prevents memory leaks

## Security Best Practices

1. **No Token Persistence:** Access token never in localStorage
2. **XSS Prevention:** Email content sanitized with forced CSS overrides
3. **CSRF Protection:** httpOnly cookies with sameSite=lax
4. **Route Guards:** ProtectedRoute checks auth before render
5. **Secure Redirects:** OAuth handled by backend, no client-side secrets

## Testing Strategy

**Manual Testing Checklist:**
- [ ] Login → stores token → dashboard accessible
- [ ] Refresh page → auto-login if refresh token valid
- [ ] Logout → clears state → redirects to login
- [ ] Gmail OAuth → connects account → loads emails
- [ ] Email list pagination → loads more on button click
- [ ] Mark as read → optimistic update → syncs with backend
- [ ] Bulk actions → selects multiple → performs action
- [ ] Resizable panel → smooth drag → stays in 300-800px range
- [ ] Mobile view → floating compose button → sidebar overlay
- [ ] Dark mode emails → forced light text → readable

## Future Enhancements

- [ ] Reply/Forward email functionality
- [ ] Attachment upload in compose
- [ ] Real-time email notifications (WebSockets)
- [ ] Email search with debouncing
- [ ] Draft auto-save
- [ ] Keyboard shortcuts (Gmail-style)
- [ ] Offline support with service workers
