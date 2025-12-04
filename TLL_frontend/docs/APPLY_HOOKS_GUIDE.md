# Quick Guide: Áp Dụng Custom Hooks vào DashboardPage

## 🎯 Mục tiêu
Refactor `DashboardPage.tsx` từ 822 dòng → ~300 dòng bằng cách sử dụng custom hooks đã tạo.

## 📋 Checklist

### Bước 1: Import Hooks
```typescript
// Thêm vào đầu file
import { useEmails } from "../hooks/useEmails";
import { useEmailActions } from "../hooks/useEmailActions";
import { useResizable } from "../hooks/useResizable";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useOutsideClick } from "../hooks/useOutsideClick";
```

### Bước 2: Thay thế Email State Management

**XÓA:**
```typescript
const [emails, setEmails] = useState<Email[]>([]);
const [pagination, setPagination] = useState({...});
const [isLoading, setIsLoading] = useState(true);
const [isLoadingMore, setIsLoadingMore] = useState(false);

// Xóa cả useEffect load emails
useEffect(() => {
  // ... 50+ lines code
}, []);

useEffect(() => {
  if (isInitialMount.current) return;
  loadEmails();
}, [activeFolder, searchQuery]);

const loadEmails = async () => {
  // ... 15+ lines
};

const loadMoreEmails = async () => {
  // ... 20+ lines  
};
```

**THAY BẰNG:**
```typescript
const {
  emails,
  setEmails,
  isLoading,
  isLoadingMore,
  loadEmails,
  loadMoreEmails,
} = useEmails({
  folder: activeFolder,
  search: searchQuery,
});
```

**Lưu ý:** Xóa `pagination` state nếu không dùng

---

### Bước 3: Thay thế Email Actions

**XÓA:**
```typescript
const handleEmailSelect = async (emailId: string) => {
  const email = emails.find((e) => e.id === emailId);
  if (email) {
    setSelectedEmail(email);
    setShowMobileDetail(true);

    if (!email.read) {
      // Optimistic update - mark as read immediately in UI
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, read: true } : e))
      );

      try {
        await emailService.markAsRead(emailId);
      } catch (error) {
        // Rollback on error
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, read: false } : e))
        );
      }
    }
  }
};

const handleToggleStar = async (emailId: string) => {
  // ... 20+ lines với optimistic update
};

const handleArchiveEmail = async (emailId: string) => {
  // ... 15+ lines
};

const handleConfirmDelete = async () => {
  // ... 40+ lines bulk delete logic
};
```

**THAY BẰNG:**
```typescript
const { 
  markAsRead, 
  toggleStar, 
  archiveEmail, 
  deleteEmail, 
  deleteBulk, 
  markBulkAsRead 
} = useEmailActions({
  emails,
  setEmails,
  selectedEmail,
  setSelectedEmail,
});

// Giữ handler đơn giản
const handleEmailSelect = async (emailId: string) => {
  const email = emails.find((e) => e.id === emailId);
  if (email) {
    setSelectedEmail(email);
    setShowMobileDetail(true);
    if (!email.read) {
      await markAsRead(emailId);
    }
  }
};

const handleToggleStar = async (emailId: string) => {
  await toggleStar(emailId);
};

const handleArchiveEmail = async (emailId: string) => {
  await archiveEmail(emailId);
};

const handleConfirmDelete = async () => {
  setIsDeleting(true);
  try {
    if (isBulkDelete && selectedEmails.size > 0) {
      await deleteBulk(Array.from(selectedEmails));
      setSelectedEmails(new Set());
    } else if (emailToDelete) {
      await deleteEmail(emailToDelete);
      setEmailToDelete(null);
    }
    setDeleteModalOpen(false);
    setIsBulkDelete(false);
  } finally {
    setIsDeleting(false);
  }
};

const handleBulkMarkRead = async () => {
  await markBulkAsRead(Array.from(selectedEmails));
  setSelectedEmails(new Set());
};
```

---

### Bước 4: Thay thế Resizable Logic

**XÓA:**
```typescript
const [emailListWidth, setEmailListWidth] = useState(() => {
  const availableWidth = window.innerWidth - (showSidebar ? 224 : 0) - 300;
  return Math.min(1080, Math.max(300, availableWidth * 0.6));
});
const [isResizing, setIsResizing] = useState(false);

const handleMouseDown = (e: React.MouseEvent) => {
  setIsResizing(true);
  e.preventDefault();
};

const handleMouseMove = React.useCallback(
  (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX - (showSidebar ? 224 : 0);
    if (newWidth >= 300 && newWidth <= 1200) {
      setEmailListWidth(newWidth);
    }
  },
  [isResizing, showSidebar]
);

const handleMouseUp = React.useCallback(() => {
  setIsResizing(false);
}, []);

React.useEffect(() => {
  if (isResizing) {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }
}, [isResizing, handleMouseMove, handleMouseUp]);
```

**THAY BẰNG:**
```typescript
const sidebarWidth = showSidebar ? 224 : 0;
const { width: emailListWidth, isResizing, handleMouseDown } = useResizable({
  minWidth: 300,
  maxWidth: 1200,
  defaultWidth: 448,
  offsetLeft: sidebarWidth,
});
```

---

### Bước 5: Thay thế Outside Click Logic

**XÓA:**
```typescript
const userMenuRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      userMenuRef.current &&
      !userMenuRef.current.contains(event.target as Node)
    ) {
      setShowUserMenu(false);
    }
  };

  if (showUserMenu) {
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }
}, [showUserMenu]);
```

**THAY BẰNG:**
```typescript
const userMenuRef = useOutsideClick(() => setShowUserMenu(false));
```

---

### Bước 6: Thêm Keyboard Navigation

**THÊM SAU CÁC STATE:**
```typescript
// ========== KEYBOARD NAVIGATION ==========
useKeyboardNav(emails, selectedEmail?.id || null, handleEmailSelect, {
  onReply: handleReply,
  onForward: handleForward,
  onDelete: handleDeleteEmail,
  onArchive: handleArchiveEmail,
  onToggleStar: handleToggleStar,
});
```

**XÓA keyboard logic trong EmailList component sau** (optional cleanup)

---

### Bước 7: Update loadMoreEmails Usage

**THAY ĐỔI:**
```typescript
const handleLoadMore = async () => {
  const count = await loadMoreEmails();
  if (count && count > 0) {
    toast.success(`Loaded ${count} more emails`);
  } else {
    toast("No more emails to load");
  }
};
```

**TRONG JSX:**
```typescript
<EmailList
  // ... other props
  onLoadMore={handleLoadMore}  // Thay vì loadMoreEmails
  isLoadingMore={isLoadingMore}
/>
```

---

## 🧪 Testing Checklist

Sau khi apply, test các features:

- [ ] Login → Dashboard loads emails
- [ ] Click email → Detail shows, marked as read
- [ ] Star email → Optimistic update works
- [ ] Delete email → Confirmation modal → Deleted
- [ ] Bulk select → Mark as read → All marked
- [ ] Bulk delete → Multiple emails deleted
- [ ] Archive email → Removed from list
- [ ] Resizable divider → Smooth drag
- [ ] User menu → Click outside → Closes
- [ ] Keyboard shortcuts:
  - [ ] `j` / `k` - Navigate emails
  - [ ] `r` - Reply
  - [ ] `f` - Forward
  - [ ] `s` - Toggle star
  - [ ] `#` - Delete
  - [ ] `e` - Archive
- [ ] Search → Filters emails
- [ ] Change folder → Loads new emails
- [ ] Load more → Pagination works
- [ ] Mobile view → Responsive

---

## 🔄 Rollback Plan

Nếu có vấn đề:

```bash
# Restore backup
cp src/pages/DashboardPage_backup.tsx src/pages/DashboardPage.tsx
```

---

## 📈 Expected Results

**Before:**
```
DashboardPage.tsx: 822 lines
├── State declarations: ~20 variables
├── useEffect hooks: 5+
├── Event handlers: 15+
└── Complex logic mixed with UI
```

**After:**
```
DashboardPage.tsx: ~300 lines
├── State declarations: ~8 variables (simplified)
├── Custom hooks: 5
├── Event handlers: 10+ (simplified)
└── Clean separation: hooks handle logic, component handles UI
```

**Code reduction:** 522 lines (63.5% decrease)

---

## 💡 Tips

1. **Apply incrementally:** Một hook một lúc, test sau mỗi thay đổi
2. **Keep git commits small:** Commit sau mỗi hook integration
3. **Don't remove old code immediately:** Comment out trước, xóa sau khi confirm works
4. **Check TypeScript errors:** `npm run build` để catch type errors
5. **Test in browser:** Manual testing là quan trọng nhất

---

## 🚀 Quick Commands

```bash
# Check current file size
wc -l src/pages/DashboardPage.tsx

# Build to check for errors
npm run build

# Run dev server
npm run dev

# Check TypeScript errors
npx tsc --noEmit
```

---

## ✅ Done!

Khi hoàn thành, DashboardPage sẽ:
- Ngắn hơn 60%
- Dễ đọc hơn
- Dễ maintain hơn
- Reusable hooks cho future features
- Separation of concerns tốt hơn
