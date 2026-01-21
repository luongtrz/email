import {
  ArchiveRestore,
  ChevronDown,
  LogOut,
  Mail,
  MailOpen,
  Menu,
  Moon,
  Sun,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/common";
import { ComposeModal } from "../components/email/ComposeModal";
import { EmailDetail } from "../components/email/EmailDetail";
import { EmailDetailModal } from "../components/email/EmailDetailModal";
import { EmailList } from "../components/email/EmailList";
import { EmailListSkeleton } from "../components/email/EmailListSkeleton";
import { EmailSummaryCard } from "../components/email/EmailSummaryCard";
import { FolderList } from "../components/email/FolderList";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { KanbanBoardSkeleton } from "../components/kanban/KanbanBoardSkeleton";
import { DeleteConfirmModal } from "../components/modals/DeleteConfirmModal";
import { SnoozeModal } from "../components/modals/SnoozeModal";
import { SearchBar } from "../components/search";
import { ViewToggle } from "../components/ViewToggle";
import { logger } from "../lib/logger";
import { emailService } from "../services/email.service";
import { useAuthStore } from "../store/auth.store";
import { useDashboardStore } from "../store/dashboard.store";
import { useThemeStore } from "../store/theme.store";
import { useKanbanConfigStore, initializeKanbanConfig } from "../store/kanbanConfig.store";
import type { Email } from "../types/email.types";
import type { KanbanEmailStatusType } from "../types/kanban.types";
import { DEFAULT_COLUMNS } from "../utils/kanban-storage.utils";
import { filterEmails, sortEmails } from "../utils/email.utils";

// ========== REACT QUERY HOOKS ==========
import {
  useDeleteEmailMutation,
  useInfiniteEmailsQuery,
  useMailboxesQuery,
  useMarkEmailReadMutation,
  useMoveEmailMutation,
  useRestoreEmailMutation,
  useSemanticSearchQuery,
  useStarEmailMutation,
} from "../hooks/queries/useEmailsQuery";

import {
  useRestoreSnoozedMutation,
  useSnoozeEmailMutation,

  useAllKanbanColumnsQuery,
  useUpdateStatusMutation
} from "../hooks/queries/useKanbanQuery";

// ========== OTHER CUSTOM HOOKS ==========
import { useDebounce } from "../hooks/useDebounce";
import { useEmailNavigation } from "../hooks/useEmailNavigation";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { useResizable } from "../hooks/useResizable";
import { useSuggestions } from "../hooks/useSuggestions";
import { useSearchHistory } from "../hooks/useSearchHistory";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { viewMode, toggleViewMode, searchQuery, isSearchMode, setSearchQuery, clearSearch, filterMode, sortBy } = useDashboardStore();
  const { columns: configColumns, isInitialized } = useKanbanConfigStore();
  const { toggleTheme, isDark } = useThemeStore();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // ========== BASIC STATE ==========
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeFolder, setActiveFolder] = useState("inbox");

  // ========== UI STATE ==========
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('showSidebar');
    return saved !== null ? saved === 'true' : true; // Default true
  });
  const [showCompose, setShowCompose] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [composeMode, setComposeMode] = useState<{
    type: "new" | "reply" | "forward";
    email?: Email;
  }>({ type: "new" });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('isAiSidebarOpen');
    return saved === 'true';
  });
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [emailToSnooze, setEmailToSnooze] = useState<string | null>(null);
  const [isLoadingEmailDetail, setIsLoadingEmailDetail] = useState(false);

  // ========== REACT QUERY HOOKS ==========
  // Use Kanban API when in Kanban view to get metadata (status, snoozeUntil)
  // Map configColumns to format expected by useAllKanbanColumnsQuery
  // Use DEFAULT_COLUMNS as fallback if store not initialized or empty
  // Memoize to prevent hook order violations
  const fullColumnConfigs = useMemo(() => {
    return (isInitialized && configColumns.length > 0) ? configColumns : DEFAULT_COLUMNS;
  }, [isInitialized, configColumns]);

  const columnConfigs = useMemo(() => {
    return fullColumnConfigs.map(col => ({ id: col.id, status: col.status }));
  }, [fullColumnConfigs]);

  const kanbanData = useAllKanbanColumnsQuery(columnConfigs, 20); // Fetch all columns for Kanban view (20 emails per column per page)

  // Search query hook (only active when search mode is enabled)
  // Uses semantic search with vector embeddings for conceptual relevance
  const searchResults = useSemanticSearchQuery(
    debouncedSearchQuery,
    20,      // limit
    0.3      // minSimilarity threshold (lowered from 0.5 for better recall)
  );

  // Folder query hook (DISABLED when in search mode to prevent dual API calls)
  // Pass empty string as folder when searching to disable the query
  const folderResults = useInfiniteEmailsQuery(
    isSearchMode ? "" : activeFolder, // Disable folder query during search
    20
  );

  // Determine which data source to use
  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    error: emailsError,
    refetch: refetchEmails,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = viewMode === "kanban"
      ? {
        data: { pages: [{ emails: kanbanData.allEmails, pagination: {} }] },
        isLoading: kanbanData.isLoading,
        error: kanbanData.isError ? new Error('Failed to load Kanban data') : null,
        refetch: kanbanData.refetch,
        fetchNextPage: async () => { },
        hasNextPage: false,
        isFetchingNextPage: false,
      }
      : isSearchMode && debouncedSearchQuery.length >= 3
        ? searchResults
        : folderResults;

  const {
    data: folders = [],
    error: foldersError,
    refetch: refetchFolders,
  } = useMailboxesQuery();

  const markReadMutation = useMarkEmailReadMutation();
  const starMutation = useStarEmailMutation();
  const deleteMutation = useDeleteEmailMutation();
  const restoreMutation = useRestoreEmailMutation();
  const moveMutation = useMoveEmailMutation();
  const updateStatusMutation = useUpdateStatusMutation();
  const restoreSnoozedMutation = useRestoreSnoozedMutation();
  const snoozeEmailMutation = useSnoozeEmailMutation();

  // ========== EMAILS FOR SUGGESTIONS (HYBRID ARCHITECTURE) ==========
  // Cache folder emails BEFORE search mode disables folderResults
  const cachedFolderEmailsRef = useRef<Email[]>([]);

  // Update cache whenever folderResults has data (NOT in search mode)
  useEffect(() => {
    if (!isSearchMode && folderResults.data?.pages) {
      const extracted = folderResults.data.pages.flatMap((page: any) => page.emails) || [];
      if (extracted.length > 0) {
        cachedFolderEmailsRef.current = extracted;
      }
    }
  }, [isSearchMode, folderResults.data]);

  // Extract emails from LIST VIEW for LOCAL suggestions
  // Use cached emails to ensure suggestions work even when folderResults is disabled during search
  const folderEmails = useMemo(() => {
    return cachedFolderEmailsRef.current;
  }, [cachedFolderEmailsRef.current]);

  // Extract emails from current view (for display, filtering, etc.)
  /* Deduplicate emails to prevent "unique key" errors */
  const emails = useMemo(() => {
    const rawEmails = emailsData?.pages.flatMap((page) => page.emails) || [];
    // Use a Map to keep only unique emails by ID (keeping the first occurrence)
    const uniqueEmailsMap = new Map();
    rawEmails.forEach(email => {
      if (!uniqueEmailsMap.has(email.id)) {
        uniqueEmailsMap.set(email.id, email);
      }
    });
    return Array.from(uniqueEmailsMap.values());
  }, [emailsData]);

  // Search history management
  const { recentSearches, addSearch, deleteSearch, clearAll } = useSearchHistory();

  // Generate search suggestions from folder emails (LOCAL, instant)
  const suggestions = useSuggestions(folderEmails, searchQuery);

  // Calculate loading state for search
  const isSearchLoading = searchResults.isLoading || isFetchingNextPage;

  // Calculate if empty state should show
  const showEmptyState = !isSearchLoading &&
    searchQuery.length >= 2 &&
    suggestions.length === 0 &&
    recentSearches.length === 0;

  // Apply filtering and sorting for Kanban view
  const processedEmails = useMemo(() => {
    if (viewMode !== "kanban") {
      return emails;
    }

    // Step 1: Filter emails
    const filtered = filterEmails(emails, filterMode);

    // Step 2: Sort filtered emails
    const sorted = sortEmails(filtered, sortBy);

    return sorted;
  }, [emails, filterMode, sortBy, viewMode]);

  // ========== EMAIL NAVIGATION (MODAL) ==========
  const {
    selectedEmail: modalSelectedEmail,
    selectedIndex: modalSelectedIndex,
    isOpen: isModalOpen,
    canGoPrevious,
    canGoNext,
    openEmail: openEmailModal,
    closeModal,
    goToNext,
    goToPrevious,
  } = useEmailNavigation({ emails });

  // ========== RESIZABLE PANEL ==========
  const {
    width: emailListWidth,
    isResizing: isResizingEmailList,
    handleMouseDown: handleEmailListMouseDown,
  } = useResizable({
    minWidth: 300,
    maxWidth: 1200,
    defaultWidth: 608,
    offsetLeft: 224,
    storageKey: 'emailListWidth',
    direction: 'right',
  });

  // AI Summary Panel Resizable (resize from left edge)
  const {
    width: aiPanelWidth,
    isResizing: isResizingAiPanel,
    handleMouseDown: handleAiPanelMouseDown,
  } = useResizable({
    minWidth: 280,
    maxWidth: 600,
    defaultWidth: 384,
    storageKey: 'aiPanelWidth',
    direction: 'left',
  });



  // Save AI sidebar toggle state to localStorage
  useEffect(() => {
    localStorage.setItem('isAiSidebarOpen', isAiSidebarOpen.toString());
  }, [isAiSidebarOpen]);

  // Save sidebar navigation toggle state to localStorage
  useEffect(() => {
    localStorage.setItem('showSidebar', showSidebar.toString());
  }, [showSidebar]);

  const userMenuRef = useOutsideClick(() => setShowUserMenu(false));

  // ========== GMAIL CONNECTION CHECK ==========
  const checkGmailConnection = useCallback((): boolean => {
    if (!emailsError) return false;
    try {
      const errorObj = emailsError as unknown as Record<string, unknown>;
      const response = errorObj?.response as Record<string, unknown>;
      const data = response?.data as Record<string, unknown>;
      const message = data?.message as string;
      return (
        typeof message === "string" &&
        message.includes("Gmail account not connected")
      );
    } catch {
      return false;
    }
  }, [emailsError]);

  const isGmailNotConnected = checkGmailConnection();

  // ========== INITIALIZE KANBAN CONFIG STORE ==========
  useEffect(() => {
    if (!isInitialized) {
      initializeKanbanConfig();
    }
  }, [isInitialized]);

  // ========== AUTO RESTORE SNOOZED EMAILS ==========
  useEffect(() => {
    // Only run in kanban view
    if (viewMode !== "kanban") return;

    // Check for expired snoozed emails every minute
    const checkSnoozed = () => {
      restoreSnoozedMutation.mutate();
    };

    // Run immediately on mount and when switching to kanban view
    checkSnoozed();

    // Set up interval to check every 60 seconds
    const interval = setInterval(checkSnoozed, 60000);

    return () => clearInterval(interval);
  }, [viewMode]); // Only re-run when viewMode changes


  // ========== EMAIL SELECTION HANDLER ==========
  const handleEmailSelect = useCallback(
    async (emailId: string) => {
      const emailFromList = emails.find((e) => e.id === emailId);
      if (!emailFromList) return;

      // Show loading state and clear current selection
      setIsLoadingEmailDetail(true);
      setSelectedEmail(null);

      // Fetch full email with body from server (important for search results)
      try {
        logger.info(`[EMAIL DETAIL] Fetching full email body for: ${emailId}`);
        const fullEmail = await emailService.getEmailById(emailId);
        if (fullEmail) {
          logger.info(`[EMAIL DETAIL] Successfully loaded email body (${fullEmail.body.length} chars)`);

          if (viewMode === "traditional") {
            setSelectedEmail(fullEmail);
            setShowMobileDetail(true);
          } else {
            // Kanban: open modal with full email
            openEmailModal(fullEmail);
          }
        }
      } catch (error) {
        logger.error("Failed to fetch full email", error);
        toast.error("Không thể tải chi tiết email");
      } finally {
        setIsLoadingEmailDetail(false);
      }

      // Mark as read with optimistic update
      if (!emailFromList.read) {
        markReadMutation.mutate({ emailId, read: true });
      }
    },
    [emails, markReadMutation, viewMode, openEmailModal]
  );

  // ========== KANBAN EMAIL SELECTION HANDLER ==========
  const handleKanbanCardClick = useCallback(
    async (email: Email) => {
      // Clear current selection first to avoid showing stale data
      setSelectedEmail(null);

      // Fetch full email with body from server
      try {
        logger.info(`[EMAIL DETAIL] Fetching full email body for: ${email.id}`);
        const fullEmail = await emailService.getEmailById(email.id);
        if (fullEmail) {
          logger.info(`[EMAIL DETAIL] Successfully loaded email body (${fullEmail.body.length} chars)`);
          setSelectedEmail(fullEmail);
          setShowMobileDetail(true);
          openEmailModal(fullEmail);
        }
      } catch (error) {
        logger.error("Failed to fetch full email", error);
        toast.error("Không thể tải chi tiết email");
      }

      // Mark as read with optimistic update
      if (!email.read) {
        markReadMutation.mutate({ emailId: email.id, read: true });
      }
    },
    [markReadMutation, openEmailModal]
  );

  // ========== EMAIL ACTIONS ==========
  const handleToggleStar = useCallback(
    async (emailId: string) => {
      const email = emails.find((e) => e.id === emailId);
      if (email) {
        starMutation.mutate({ emailId, starred: !email.starred });
      }
    },
    [emails, starMutation]
  );

  const handleDeleteEmail = useCallback((emailId: string) => {
    setEmailToDelete(emailId);
    setIsBulkDelete(false);
    setDeleteModalOpen(true);
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedEmails.size === 0) return;
    setIsBulkDelete(true);
    setDeleteModalOpen(true);
  }, [selectedEmails]);

  const confirmDelete = useCallback(async () => {
    if (isBulkDelete) {
      // Bulk delete
      const promises = Array.from(selectedEmails).map((id) =>
        deleteMutation.mutateAsync({ emailId: id, currentFolder: activeFolder })
      );
      await Promise.all(promises);
      setSelectedEmails(new Set());
      if (selectedEmail && selectedEmails.has(selectedEmail.id)) {
        setSelectedEmail(null);
      }
    } else if (emailToDelete) {
      // Single delete
      await deleteMutation.mutateAsync({ emailId: emailToDelete, currentFolder: activeFolder });
      if (selectedEmail?.id === emailToDelete) {
        setSelectedEmail(null);
      }
    }
    setDeleteModalOpen(false);
    setEmailToDelete(null);
  }, [
    isBulkDelete,
    selectedEmails,
    emailToDelete,
    selectedEmail,
    deleteMutation,
  ]);

  const handleMarkBulkAsRead = useCallback(async () => {
    if (selectedEmails.size === 0) return;

    const promises = Array.from(selectedEmails).map((id) =>
      markReadMutation.mutateAsync({ emailId: id, read: true })
    );

    await Promise.all(promises);
    setSelectedEmails(new Set());
    toast.success(`Đã đánh dấu ${promises.length} email là đã đọc`);
  }, [selectedEmails, markReadMutation]);

  const handleBulkRestore = useCallback(async () => {
    if (selectedEmails.size === 0) return;

    const promises = Array.from(selectedEmails).map((id) =>
      restoreMutation.mutateAsync(id)
    );

    await Promise.all(promises);
    setSelectedEmails(new Set());
    if (selectedEmail && selectedEmails.has(selectedEmail.id)) {
      setSelectedEmail(null);
    }
  }, [selectedEmails, restoreMutation, selectedEmail]);

  const handleArchiveEmail = useCallback(
    async (emailId: string) => {
      // Archive = remove from inbox + add ARCHIVED label
      // For now, just delete (move to trash)
      await deleteMutation.mutateAsync({ emailId, currentFolder: activeFolder });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    },
    [selectedEmail, deleteMutation]
  );

  // ========== SNOOZE HANDLER ==========
  const handleSnoozeConfirm = useCallback(
    async (until: Date) => {
      if (!emailToSnooze) return;

      await snoozeEmailMutation.mutateAsync({
        emailId: emailToSnooze,
        until
      });

      setSnoozeModalOpen(false);
      setEmailToSnooze(null);
    },
    [emailToSnooze, snoozeEmailMutation]
  );

  // ========== COMPOSE HANDLERS ==========
  const handleReply = useCallback((email: Email) => {
    setComposeMode({ type: "reply", email });
    setShowCompose(true);
  }, []);

  const handleForward = useCallback((email: Email) => {
    setComposeMode({ type: "forward", email });
    setShowCompose(true);
  }, []);

  // ========== EMAIL MOVE HANDLER (KANBAN) ==========
  const handleEmailMove = useCallback(
    async (emailId: string, targetColumnId: string) => {
      // Use config columns if available, otherwise fallback to defaults
      const columns = isInitialized ? configColumns : DEFAULT_COLUMNS;

      // Find target column to get status and Gmail label
      const targetColumn = columns.find(col => col.id === targetColumnId);
      if (!targetColumn) return;

      // Special case: Snoozed requires time selection (check by status, not ID)
      if (targetColumn.status === 'SNOOZED') {
        setEmailToSnooze(emailId);
        setSnoozeModalOpen(true);
        return;
      }

      // Find source column to get previous Gmail label
      const email = processedEmails.find(e => e.id === emailId);
      if (!email) {
        return;
      }

      const currentStatus = (email as any).status as KanbanEmailStatusType | undefined;
      const sourceColumn = currentStatus
        ? columns.find(col => col.status === currentStatus)
        : null;

      const targetGmailLabelId = targetColumn.gmailLabelId ?? null;
      const previousGmailLabelId = sourceColumn?.gmailLabelId ?? null;

      // In Kanban view: update status with optional Gmail label sync
      if (viewMode === "kanban") {
        updateStatusMutation.mutate({
          emailId,
          status: targetColumn.status, // Send status from localStorage
          gmailLabelId: targetGmailLabelId,
          previousGmailLabelId,
          targetColumnId: targetColumn.id // Pass column ID for optimistic update
        });
      }
      // In List view: move to Gmail folder
      else {
        moveMutation.mutate({ emailId, folder: targetColumnId });
      }
    },
    [viewMode, moveMutation, updateStatusMutation, isInitialized, configColumns, processedEmails]
  );

  // ========== FOLDER CHANGE HANDLER ==========
  const handleFolderChange = useCallback((folderId: string) => {
    setActiveFolder(folderId);
    setSelectedEmail(null);
    setSelectedEmails(new Set());
    setShowMobileMenu(false);
  }, []);

  // ========== SEARCH HANDLER ==========
  const handleSearch = useCallback((query: string) => {
    // Search is triggered automatically via debounced query
    // This is called when user presses Enter or selects a suggestion
    setSearchQuery(query);
  }, [setSearchQuery]);

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, [setSearchQuery]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
    setSelectedEmail(null);
    setSelectedEmails(new Set());
  }, [clearSearch]);

  // ========== LOAD MORE ==========
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ========== BULK SELECTION ==========
  const handleEmailCheckbox = useCallback(
    (emailId: string, checked: boolean) => {
      const newSelected = new Set(selectedEmails);
      if (checked) {
        newSelected.add(emailId);
      } else {
        newSelected.delete(emailId);
      }
      setSelectedEmails(newSelected);
    },
    [selectedEmails]
  );

  // ========== LOGOUT HANDLER ==========
  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  // ========== MOBILE HANDLERS ==========
  const handleBackToList = useCallback(() => {
    setShowMobileDetail(false);
    setShowMobileMenu(false);
    setSelectedEmails(new Set());
  }, []);

  // ========== KEYBOARD NAVIGATION ==========
  useKeyboardNav(emails, selectedEmail?.id || null, handleEmailSelect, {
    onReply: handleReply,
    onForward: handleForward,
    onDelete: handleDeleteEmail,
    onArchive: handleArchiveEmail,
    onToggleStar: handleToggleStar,
  });

  // ========== KEYBOARD SHORTCUTS ==========
  useKeyboardShortcuts({
    toggleView: toggleViewMode,
    createEmail: () => {
      setComposeMode({ type: "new" });
      setShowCompose(true);
    },
    searchFocus: () => searchInputRef.current?.focus(),
    escape: () => {
      if (showCompose) {
        setShowCompose(false);
        setComposeMode({ type: "new" });
      } else if (showMobileDetail) {
        setShowMobileDetail(false);
      } else if (deleteModalOpen) {
        setDeleteModalOpen(false);
      } else if (isSearchMode) {
        handleClearSearch();
      }
    },
  });

  // ========== AUTO-LOGOUT ON AUTH ERROR ==========
  useEffect(() => {
    if (foldersError && !isGmailNotConnected) {
      try {
        const error = foldersError as unknown as Record<string, unknown>;
        const response = error?.response as Record<string, unknown>;
        if (response?.status === 401) {
          logout();
          navigate("/login", { replace: true });
        }
      } catch {
        // Ignore errors in error handling
      }
    }
  }, [foldersError, isGmailNotConnected, logout, navigate]);

  // ========== ERROR DISPLAY ==========
  if (foldersError && !isGmailNotConnected) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ErrorMessage
          error={foldersError as Error}
          title="Failed to load mailboxes"
          retry={() => refetchFolders()}
        />
      </div>
    );
  }

  if (emailsError && !isGmailNotConnected) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ErrorMessage
          error={emailsError as Error}
          title="Failed to load emails"
          retry={() => refetchEmails()}
        />
      </div>
    );
  }

  return (
    <div
      className={`h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200 ${(isResizingEmailList || isResizingAiPanel) ? "cursor-col-resize select-none" : ""
        }`}
    >
      {/* Gmail-style Header - Clean & Modern */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 flex-shrink-0 sticky top-0 z-30 transition-colors duration-300">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          {/* Left Section - Branding & Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setShowSidebar(!showSidebar);
                } else {
                  setShowMobileMenu(true);
                }
              }}
              className="p-2 -ml-2 hover:bg-gray-100/80 rounded-lg text-gray-500 hover:text-gray-900 transition-all duration-200 lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 -ml-2 hover:bg-gray-100/80 dark:hover:bg-slate-800 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 transition-all duration-200 hidden lg:block ${!showSidebar ? "bg-gray-50 dark:bg-slate-800/50 text-gray-900 dark:text-slate-200" : ""}`}
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
                <Mail className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block tracking-tight">
                Mailbox
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            ref={searchInputRef}
            query={searchQuery}
            onQueryChange={handleSearchInputChange}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            suggestions={suggestions}
            isLoading={isSearchLoading}
            recentSearches={recentSearches}
            onSearchHistoryAdd={addSearch}
            onDeleteHistory={deleteSearch}
            onClearAllHistory={clearAll}
            showEmptyState={showEmptyState}
            className="flex-1 max-w-2xl hidden md:block"
          />

          {/* View Toggle */}
          <ViewToggle className="ml-4" />

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "U"}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:inline max-w-[150px] truncate">
                {user?.name || user?.email}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden md:inline flex-shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Floating Board Layout */}
      <div className="flex-1 flex overflow-hidden p-3">
        {/* Sidebar - Desktop (Floating Card) */}
        <div
          className={`hidden ${viewMode === "kanban" ? "" : "lg:flex"} flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 dark:border-gray-700/50 transition-all duration-200 mr-3 ${showSidebar ? "w-56" : "w-16"
            }`}
        >
          <FolderList
            folders={folders}
            activeFolder={activeFolder}
            onFolderChange={handleFolderChange}
            onCompose={() => {
              setComposeMode({ type: "new" });
              setShowCompose(true);
            }}
            isCollapsed={!showSidebar}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {showMobileMenu && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileMenu(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-white">
              <FolderList
                folders={folders}
                activeFolder={activeFolder}
                onFolderChange={handleFolderChange}
                onCompose={() => {
                  setComposeMode({ type: "new" });
                  setShowCompose(true);
                  setShowMobileMenu(false);
                }}
                isCollapsed={false}
              />
            </div>
          </div>
        )}

        {/* Email List / Kanban View */}
        {viewMode === "traditional" ? (
          // Traditional List View
          <>
            <div
              className={`relative flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100/50 dark:border-slate-800
                overflow-hidden min-h-0
                ${showMobileDetail ? "hidden" : "flex"} lg:flex`}
              style={{ width: emailListWidth }}
            >
              {/* Bulk Actions Bar */}
              {selectedEmails.size > 0 && (
                <div className="flex items-center justify-center gap-4 px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedEmails.size} selected
                  </span>
                  {activeFolder === 'trash' ? (
                    <button
                      onClick={handleBulkRestore}
                      className="p-2 hover:bg-blue-100 rounded transition-colors"
                      title="Khôi phục"
                    >
                      <ArchiveRestore className="w-5 h-5 text-blue-700" />
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkBulkAsRead}
                      className="p-2 hover:bg-blue-100 rounded transition-colors"
                      title="Mark as read"
                    >
                      <MailOpen className="w-5 h-5 text-blue-700" />
                    </button>
                  )}
                  <button
                    onClick={handleBulkDelete}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-blue-700" />
                  </button>
                  <button
                    onClick={() => setSelectedEmails(new Set())}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-5 h-5 text-blue-700" />
                  </button>
                </div>
              )}

              {/* Search Results Header */}
              {isSearchMode && debouncedSearchQuery.length >= 3 && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-slate-800/80 border-b border-blue-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        Search results for "{debouncedSearchQuery}"
                      </p>
                      {!isLoadingEmails && (
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                          {emails.length} {emails.length === 1 ? 'email' : 'emails'} found
                          {emailsData?.pages?.[0]?.pagination &&
                            ` (${(emailsData.pages[0].pagination as { total?: number }).total || 0} total)`
                          }
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleClearSearch}
                      className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear (ESC)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Email List Content */}
                <div className="flex-1 min-h-0 relative">
                  {/* ... (Email List Component render) ... */}
                  {isLoadingEmails ? (
                    <EmailListSkeleton />
                  ) : filterMode === "UNREAD" && emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MailOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        All caught up!
                      </h3>
                      <p className="text-gray-500 mb-4">
                        No unread emails in {activeFolder}
                      </p>
                      {activeFolder !== "inbox" && (
                        <button
                          onClick={() => setActiveFolder("inbox")}
                          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <ChevronDown className="w-4 h-4 rotate-90" />
                          Back to Inbox
                        </button>
                      )}
                    </div>
                  ) : (
                    <EmailList
                      emails={emails}
                      selectedEmailId={selectedEmail?.id || null}
                      onEmailSelect={handleEmailSelect}
                      onToggleStar={handleToggleStar}
                      selectedEmails={selectedEmails}
                      onEmailToggle={handleEmailCheckbox}
                      isLoadingMore={isFetchingNextPage}
                      onLoadMore={hasNextPage ? handleLoadMore : undefined}
                    />
                  )}
                </div>
              </div>

              {/* Invisible Resize Handle - Visible on Hover */}

            </div>

            {/* Visible Resize Handle - Gutter */}
            <div
              className="w-3 cursor-col-resize hover:bg-blue-50/50 active:bg-blue-100 transition-colors bg-transparent flex flex-col items-center justify-center gap-1 group/handle z-50 flex-shrink-0"
              onMouseDown={handleEmailListMouseDown}
            >
              <div className="w-1 h-8 bg-gray-200 rounded-full group-hover/handle:bg-blue-400 transition-all duration-200" />
            </div>

            {/* Email Detail (Floating Card) */}
            {/* Email Detail & AI Wrapper (Transparent container for layout) */}
            <div
              className={`flex-1 flex overflow-hidden min-w-0 bg-transparent ${!showMobileDetail && "hidden lg:flex"
                }`}
            >
              {/* Main Email Detail Content (Floating Card) */}
              <div className={`flex-1 flex flex-col overflow-hidden min-w-0 rounded-2xl shadow-sm bg-white dark:bg-gray-800 border border-white/50 dark:border-gray-700/50 ${isAiSidebarOpen && selectedEmail ? "" : ""}`}>
                {isLoadingEmailDetail ? (
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <div className="text-center">
                      <div className="relative">
                        <Mail className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      </div>
                      <p className="text-lg font-medium text-gray-600">Loading email...</p>
                    </div>
                  </div>
                ) : selectedEmail ? (
                  <EmailDetail
                    email={selectedEmail}
                    onReply={handleReply}
                    onForward={handleForward}
                    onClose={handleBackToList}
                    onToggleAi={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
                    isAiOpen={isAiSidebarOpen}
                    currentFolder={activeFolder}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <div className="text-center">
                      <Mail className="w-24 h-24 mx-auto mb-4 opacity-20" />
                      <p className="text-lg">Select an email to read</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Summary Panel - Right Side (Floating Card) */}
              {isAiSidebarOpen && selectedEmail && (
                <>
                  {/* AI Panel Resize Handle - Gutter */}
                  <div
                    className="w-3 cursor-col-resize hover:bg-blue-50/50 active:bg-blue-100 transition-colors bg-transparent flex flex-col items-center justify-center gap-1 group/handle z-50 flex-shrink-0"
                    onMouseDown={handleAiPanelMouseDown}
                  >
                    <div className="w-1 h-8 bg-gray-200 rounded-full group-hover/handle:bg-blue-400 transition-all duration-200" />
                  </div>

                  <div
                    className="relative flex-shrink-0 overflow-y-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 dark:border-gray-700/50 group ms-1"
                    style={{ width: aiPanelWidth }}
                  >


                    {/* AI Panel Header */}
                    <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between z-10 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white tracking-tight text-sm">AI Insights</h3>
                      </div>
                      <button
                        onClick={() => setIsAiSidebarOpen(false)}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-5">
                      <EmailSummaryCard emailId={selectedEmail.id} summary={selectedEmail.aiSummary} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          // Kanban View
          <div
            className={`flex-1 bg-white overflow-hidden ${showMobileDetail ? "hidden" : "flex"
              } lg:flex flex-col`}
          >
            {isLoadingEmails ? (
              <KanbanBoardSkeleton />
            ) : isGmailNotConnected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Gmail account not connected
                  </p>
                  <a
                    href="/auth/google/url"
                    className="text-blue-600 hover:underline"
                  >
                    Connect Gmail
                  </a>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Mail className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No emails found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery
                      ? "Try a different search query"
                      : "This folder is empty"}
                  </p>
                </div>
              </div>
            ) : (
              <KanbanBoard
                emails={processedEmails}
                columns={fullColumnConfigs}
                onCardClick={handleKanbanCardClick}
                onCardStar={handleToggleStar}
                onEmailMove={handleEmailMove}
                selectedEmailId={selectedEmail?.id || null}
                onLoadMore={kanbanData.hasMore ? kanbanData.loadMore : undefined}
                isLoadingMore={kanbanData.isFetchingMore}
              />
            )}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => {
            setShowCompose(false);
            setComposeMode({ type: "new" });
          }}
          onSent={() => {
            setShowCompose(false);
            setComposeMode({ type: "new" });
          }}
          replyTo={
            composeMode.type === "reply" && composeMode.email
              ? {
                id: composeMode.email.id,
                subject: composeMode.email.subject,
                from: composeMode.email.from,
                body: composeMode.email.body,
              }
              : undefined
          }
          forwardEmail={
            composeMode.type === "forward" && composeMode.email
              ? {
                id: composeMode.email.id,
                subject: composeMode.email.subject,
                body: composeMode.email.body,
                attachments: composeMode.email.attachments,
              }
              : undefined
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setEmailToDelete(null);
        }}
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
        message={
          isBulkDelete
            ? `Are you sure you want to delete ${selectedEmails.size} emails? This action cannot be undone.`
            : "This action cannot be undone. The email will be moved to trash."
        }
      />

      {/* Email Detail Modal - For Kanban View */}
      {viewMode === "kanban" && (
        <EmailDetailModal
          email={modalSelectedEmail}
          isOpen={isModalOpen}
          onClose={closeModal}
          onEmailUpdated={() => {
            refetchEmails();
            refetchFolders();
          }}
          onReply={handleReply}
          onForward={handleForward}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onPrevious={goToPrevious}
          onNext={goToNext}
          currentIndex={modalSelectedIndex}
          totalEmails={emails.length}
        />
      )}

      {/* Snooze Modal */}
      <SnoozeModal
        isOpen={snoozeModalOpen}
        onClose={() => {
          setSnoozeModalOpen(false);
          setEmailToSnooze(null);
        }}
        onConfirm={handleSnoozeConfirm}
        isLoading={snoozeEmailMutation.isPending}
      />

      {/* Floating Compose Button - Mobile */}
      <button
        onClick={() => {
          setComposeMode({ type: "new" });
          setShowCompose(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-30"
        aria-label="Compose email"
      >
        <Mail className="w-6 h-6" />
      </button>
    </div>
  );
};
