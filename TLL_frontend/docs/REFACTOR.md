# Frontend Refactoring Plan - TLL Email Dashboard

## 🎯 Mục Tiêu Refactoring

Codebase hiện tại có nhiều vấn đề:
- **DashboardPage.tsx**: 822 dòng code với 20+ state variables
- **Trùng lặp logic**: Auth context + Zustand store cùng quản lý state
- **Thiếu separation of concerns**: UI + Business logic + API calls trộn lẫn
- **Không có custom hooks**: Logic tái sử dụng bị copy-paste
- **File _old không dùng**: LoginPage_old.tsx, DashboardPage_old.tsx
- **Keyboard navigation logic**: Nằm trong EmailList component (170+ dòng)

## 📋 Kế Hoạch Chia Phases

### **PHASE 1: Cleanup & Structure** ✅ (30 phút)
**Mục tiêu:** Dọn dẹp code thừa, tổ chức lại folder structure

#### 1.1 Xóa Files Không Dùng
- [ ] `DashboardPage_old.tsx`
- [ ] `LoginPage_old.tsx`
- [ ] `InboxPage.tsx` (chỉ là placeholder)

#### 1.2 Tổ Chức Lại Folder Structure
```
src/
├── components/
│   ├── common/              # Shared components
│   │   ├── Navbar.tsx
│   │   ├── SearchBar.tsx
│   │   └── UserMenu.tsx
│   ├── email/
│   │   ├── EmailList/
│   │   │   ├── EmailList.tsx
│   │   │   ├── EmailListItem.tsx
│   │   │   └── EmailListSkeleton.tsx
│   │   ├── EmailDetail/
│   │   │   ├── EmailDetail.tsx
│   │   │   ├── EmailActions.tsx
│   │   │   └── EmailAttachments.tsx
│   │   ├── Compose/
│   │   │   └── ComposeModal.tsx
│   │   └── Sidebar/
│   │       ├── FolderList.tsx
│   │       └── ResizableDivider.tsx
│   └── modals/
│       └── DeleteConfirmModal.tsx
├── hooks/                   # Custom hooks (NEW!)
│   ├── useEmails.ts
│   ├── useEmailActions.ts
│   ├── useResizable.ts
│   ├── useKeyboardNav.ts
│   └── useOutsideClick.ts
├── pages/
│   ├── DashboardPage.tsx    # Slimmed down to 200 lines
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
└── utils/                   # Helper functions (NEW!)
    ├── email.utils.ts
    └── format.utils.ts
```

---

### **PHASE 2: Extract Custom Hooks** 🔥 (1 giờ)
**Mục tiêu:** Tách business logic ra khỏi components

#### 2.1 `useEmails` Hook
**Chức năng:** Quản lý email list state + pagination + loading
```typescript
// hooks/useEmails.ts
export const useEmails = (folder: string, search: string) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState({...});
  const [isLoading, setIsLoading] = useState(false);
  
  const loadEmails = async () => {...};
  const loadMoreEmails = async () => {...};
  
  useEffect(() => {
    loadEmails();
  }, [folder, search]);
  
  return { emails, pagination, isLoading, loadMoreEmails, setEmails };
};
```

#### 2.2 `useEmailActions` Hook
**Chức năng:** Tất cả actions (mark read, star, delete, archive)
```typescript
// hooks/useEmailActions.ts
export const useEmailActions = (emails: Email[], setEmails: Dispatch<SetStateAction<Email[]>>) => {
  const markAsRead = async (emailId: string) => {
    // Optimistic update
    setEmails(prev => prev.map(...));
    try {
      await emailService.markAsRead(emailId);
    } catch {
      // Rollback
    }
  };
  
  const toggleStar = async (emailId: string) => {...};
  const archiveEmail = async (emailId: string) => {...};
  const deleteEmail = async (emailId: string) => {...};
  
  return { markAsRead, toggleStar, archiveEmail, deleteEmail };
};
```

#### 2.3 `useResizable` Hook
**Chức năng:** Resizable panel logic
```typescript
// hooks/useResizable.ts
export const useResizable = (minWidth: number, maxWidth: number, defaultWidth: number) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  
  const handleMouseDown = (e: React.MouseEvent) => {...};
  const handleMouseMove = useCallback((e: MouseEvent) => {...}, []);
  const handleMouseUp = useCallback(() => {...}, []);
  
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {...};
    }
  }, [isResizing]);
  
  return { width, isResizing, handleMouseDown };
};
```

#### 2.4 `useKeyboardNav` Hook
**Chức năng:** Gmail-style keyboard shortcuts
```typescript
// hooks/useKeyboardNav.ts
export const useKeyboardNav = (
  emails: Email[],
  selectedEmailId: string | null,
  onEmailSelect: (id: string) => void,
  actions: {
    onReply?: (email: Email) => void;
    onForward?: (email: Email) => void;
    onDelete?: (id: string) => void;
    onArchive?: (id: string) => void;
    onToggleStar?: (id: string) => void;
  }
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // j/k navigation, r (reply), f (forward), etc.
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedEmailId]);
};
```

#### 2.5 `useOutsideClick` Hook
**Chức năng:** Close modals when clicking outside
```typescript
// hooks/useOutsideClick.ts
export const useOutsideClick = (callback: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);
  
  return ref;
};
```

---

### **PHASE 3: Component Decomposition** 🧩 (1 giờ)
**Mục tiêu:** Chia nhỏ components quá lớn

#### 3.1 Extract từ DashboardPage
**Tạo components mới:**

**a) `Navbar.tsx`** (Header section)
```typescript
interface NavbarProps {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  user: User | null;
  onLogout: () => void;
}
```

**b) `BulkActionsBar.tsx`** (Selection toolbar)
```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  onMarkRead: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}
```

**c) `EmailListContainer.tsx`** (Email list + divider + detail)
```typescript
// Wrapper component quản lý layout 3 cột
<div className="flex flex-1 overflow-hidden">
  <FolderList />
  <ResizableDivider />
  <EmailList />
  <EmailDetail />
</div>
```

#### 3.2 Refactor EmailList Component
**Tách thành:**

**a) `EmailListItem.tsx`**
```typescript
// Single email row component
interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: (checked: boolean) => void;
  onToggleStar: () => void;
}
```

**b) `EmailList.tsx` (slim version)**
```typescript
// Chỉ map qua emails, không chứa keyboard logic
{emails.map(email => (
  <EmailListItem
    key={email.id}
    email={email}
    {...props}
  />
))}
```

Keyboard navigation → Move to `useKeyboardNav` hook

#### 3.3 Refactor EmailDetail Component
**Tách thành:**

**a) `EmailActions.tsx`**
```typescript
// Action buttons: Reply, Forward, Archive, Delete, Star
interface EmailActionsProps {
  email: Email;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}
```

**b) `EmailAttachments.tsx`**
```typescript
interface EmailAttachmentsProps {
  attachments: Email['attachments'];
  emailId: string;
}
```

---

### **PHASE 4: State Management Cleanup** 🗂️ (45 phút)
**Mục tiêu:** Loại bỏ duplication giữa AuthContext + Zustand

#### 4.1 Quyết Định: KEEP ZUSTAND, REMOVE CONTEXT
**Lý do:**
- Zustand đơn giản hơn, ít boilerplate
- Không cần Provider wrapper
- Performance tốt hơn (không re-render toàn tree)
- Có devtools

**Changes:**
1. Xóa `AuthContext.tsx`
2. Move login/register/logout logic vào `auth.store.ts`
3. Components dùng `useAuthStore()` directly

#### 4.2 Refactor auth.store.ts
**Thêm async actions:**
```typescript
// store/auth.store.ts
export const useAuthStore = create<AuthState>((set, get) => ({
  // ... existing state
  
  // Async actions
  login: async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    set({
      accessToken: response.data.accessToken,
      user: response.data.user,
      isAuthenticated: true,
    });
  },
  
  register: async (data: RegisterRequest) => {...},
  
  initAuth: async () => {
    try {
      const refreshResponse = await authApi.refreshToken();
      set({ accessToken: refreshResponse.data.accessToken });
      
      const profile = await authApi.getProfile();
      set({ user: profile.data, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: false });
    }
  },
}));
```

#### 4.3 Update Components
```typescript
// Before
const { login } = useAuth();

// After
const login = useAuthStore(state => state.login);
```

---

### **PHASE 5: Utility Functions** 🛠️ (30 phút)
**Mục tiêu:** Extract reusable helper functions

#### 5.1 `utils/email.utils.ts`
```typescript
export const getEmailPreview = (content: string, maxLength: number = 100): string => {
  // Strip HTML, truncate
};

export const getEmailDate = (date: string): string => {
  // Format: "Today 2:30 PM", "Yesterday", "Dec 3"
};

export const parseEmailAddresses = (addresses: string | string[]): string[] => {
  // Normalize to array
};
```

#### 5.2 `utils/format.utils.ts`
```typescript
export const formatFileSize = (bytes: number): string => {
  // "1.5 MB", "320 KB"
};

export const truncate = (text: string, maxLength: number): string => {
  // With ellipsis
};
```

---

### **PHASE 6: Error Handling & Loading States** 🚨 (30 phút)
**Mục tiêu:** Centralized error handling

#### 6.1 Error Boundary Component
```typescript
// components/common/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### 6.2 Loading States
**Create:** `components/common/LoadingSpinner.tsx`
**Replace:** All inline loading divs với shared component

#### 6.3 Toast Standardization
**Create:** `utils/toast.utils.ts`
```typescript
export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  toast.error(message);
};
```

---

### **PHASE 7: TypeScript Improvements** 📘 (30 phút)
**Mục tiêu:** Better type safety

#### 7.1 Extract Common Types
```typescript
// types/common.types.ts
export interface Pagination {
  page: number;
  total: number;
  limit: number;
  totalPages: number;
  nextPageToken?: string;
}

export interface ApiResponse<T> {
  message: string;
  code: number;
  data: T;
}
```

#### 7.2 Strict Props Interfaces
```typescript
// NO implicit any
// NO optional props without defaults
// YES discriminated unions for modals
type ComposeMode = 
  | { type: 'new' }
  | { type: 'reply'; email: Email }
  | { type: 'forward'; email: Email };
```

---

### **PHASE 8: Performance Optimizations** ⚡ (45 phút)
**Mục tiêu:** Reduce re-renders, improve UX

#### 8.1 React.memo Optimization
```typescript
export const EmailListItem = React.memo<EmailListItemProps>(({ email }) => {
  // Only re-render if email prop changes
}, (prev, next) => {
  return prev.email.id === next.email.id && 
         prev.email.read === next.email.read;
});
```

#### 8.2 useCallback for Event Handlers
```typescript
const handleEmailSelect = useCallback((emailId: string) => {
  // ... logic
}, [dependencies]);
```

#### 8.3 Virtualized List (Optional - nếu có time)
**Library:** `react-window`
```typescript
// Only render visible emails in viewport
<FixedSizeList
  height={800}
  itemCount={emails.length}
  itemSize={68}
>
  {({ index, style }) => (
    <EmailListItem email={emails[index]} style={style} />
  )}
</FixedSizeList>
```

---

## 🎯 Expected Results

### Before Refactoring
- **DashboardPage.tsx**: 822 lines
- **State variables**: 20+
- **Custom hooks**: 0
- **Components**: 10
- **Code duplication**: High

### After Refactoring
- **DashboardPage.tsx**: ~200 lines
- **State variables**: 5-7
- **Custom hooks**: 5
- **Components**: 18
- **Code duplication**: Minimal
- **Maintainability**: ⭐⭐⭐⭐⭐

---

## 📊 Metrics to Track

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| DashboardPage LOC | 822 | ~200 | 76% ↓ |
| Cyclomatic Complexity | High | Low | 60% ↓ |
| Component Reusability | Low | High | 80% ↑ |
| Type Safety | Medium | High | 40% ↑ |

---

## 🚀 Execution Order

1. **PHASE 1** - Cleanup (low risk)
2. **PHASE 2** - Hooks (medium risk, high value)
3. **PHASE 4** - Auth store (medium risk)
4. **PHASE 3** - Components (low risk)
5. **PHASE 5** - Utils (low risk)
6. **PHASE 6** - Error handling (low risk)
7. **PHASE 7** - TypeScript (low risk)
8. **PHASE 8** - Performance (optional)

---

## ⚠️ Risk Management

### High-Risk Changes
- Removing AuthContext (many components depend on it)
- Keyboard navigation refactor (complex logic)

**Mitigation:** Test thoroughly after each phase

### Medium-Risk Changes
- Extracting hooks (might break state management)
- Component decomposition (props drilling)

**Mitigation:** Keep git commits small, test incrementally

### Low-Risk Changes
- File cleanup
- Utility functions
- Type improvements

---

## ✅ Testing Checklist (After Each Phase)

- [ ] Login → Dashboard works
- [ ] Email list loads correctly
- [ ] Click email → Detail shows
- [ ] Mark as read → Optimistic update works
- [ ] Keyboard shortcuts (j/k/r/f) work
- [ ] Bulk actions → Select + Delete works
- [ ] Resizable divider → Smooth drag
- [ ] Search → Filters emails
- [ ] Load more → Pagination works
- [ ] Mobile view → Responsive layout
- [ ] Gmail OAuth → Connects account
- [ ] Logout → Clears state

---

## 📝 Notes

- **Không cần viết tests**: Focus vào refactoring, manual testing is enough
- **Incremental approach**: Commit sau mỗi phase
- **Backward compatibility**: Giữ API service layer unchanged
- **Documentation**: Update docs/ARCHITECTURE.md sau khi xong

---

## 🎉 Bonus Improvements (If Time Allows)

- [ ] Add keyboard shortcuts modal (press `?`)
- [ ] Debounce search input (500ms delay)
- [ ] Email draft auto-save
- [ ] Unread count badge on favicon
- [ ] Offline mode với service workers
- [ ] Dark mode support
- [ ] Email filters (unread, starred, has attachments)

---

**Estimated Total Time:** 5-6 giờ (full refactoring)

**Start with:** PHASE 1 → Quick wins, immediate impact
