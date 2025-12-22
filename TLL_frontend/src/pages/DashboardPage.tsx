import {
  ChevronDown,
  LogOut,
  Mail,
  MailOpen,
  Menu,
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
import { useKanbanConfigStore } from "../store/kanbanConfig.store";
import type { Email } from "../types/email.types";
import { DEFAULT_KANBAN_COLUMNS } from "../types/kanban.types";
import { filterEmails, sortEmails } from "../utils/email.utils";

// ========== REACT QUERY HOOKS ==========
import {
  useDeleteEmailMutation,
  useInfiniteEmailsQuery,
  useMailboxesQuery,
  useMarkEmailReadMutation,
  useMoveEmailMutation,
  useSearchEmailsQuery,
  useStarEmailMutation,
} from "../hooks/queries/useEmailsQuery";

import { 
  useRestoreSnoozedMutation, 
  useSnoozeEmailMutation,
  // useKanbanEmailsQuery,
  useAllKanbanColumnsQuery,
  useUpdateStatusMutation
} from "../hooks/queries/useKanbanQuery";

// ========== OTHER CUSTOM HOOKS ==========
import { useDebounce } from "../hooks/useDebounce";
import { useEmailNavigation } from "../hooks/useEmailNavigation";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { useResizable } from "../hooks/useResizable";
import { useSuggestions } from "../hooks/useSuggestions";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { viewMode, toggleViewMode, searchQuery, isSearchMode, setSearchQuery, clearSearch, filterMode, sortBy } = useDashboardStore();
  const { columns: configColumns, isInitialized } = useKanbanConfigStore();
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
  const [showSidebar, setShowSidebar] = useState(true);
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
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [emailToSnooze, setEmailToSnooze] = useState<string | null>(null);

  // ========== REACT QUERY HOOKS ==========
  // Use Kanban API when in Kanban view to get metadata (status, snoozeUntil)
  const kanbanData = useAllKanbanColumnsQuery(20); // Fetch all columns for Kanban view (20 emails per column per page)
  
  // Search query hook (only active when search mode is enabled)
  const searchResults = useSearchEmailsQuery(
    debouncedSearchQuery,
    20
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
        fetchNextPage: async () => {},
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
  const moveMutation = useMoveEmailMutation();
  const updateStatusMutation = useUpdateStatusMutation();
  const restoreSnoozedMutation = useRestoreSnoozedMutation();
  const snoozeEmailMutation = useSnoozeEmailMutation();

  // Extract emails from infinite query data
  const emails = useMemo(
    () => emailsData?.pages.flatMap((page) => page.emails) || [],
    [emailsData]
  );

  // Generate search suggestions from current emails
  const suggestions = useSuggestions(emails, searchQuery, 5);

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
    isResizing,
    handleMouseDown,
  } = useResizable({
    minWidth: 300,
    maxWidth: 1200,
    defaultWidth: 608,
    offsetLeft: 224,
  });

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

      // Clear current selection first to avoid showing stale data
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
        toast.error("Failed to load email details");
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
        toast.error("Failed to load email details");
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
        deleteMutation.mutateAsync(id)
      );
      await Promise.all(promises);
      setSelectedEmails(new Set());
      if (selectedEmail && selectedEmails.has(selectedEmail.id)) {
        setSelectedEmail(null);
      }
    } else if (emailToDelete) {
      // Single delete
      await deleteMutation.mutateAsync(emailToDelete);
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
    toast.success(`Marked ${promises.length} emails as read`);
  }, [selectedEmails, markReadMutation]);

  const handleArchiveEmail = useCallback(
    async (emailId: string) => {
      // Archive = remove from inbox + add ARCHIVED label
      // For now, just delete (move to trash)
      await deleteMutation.mutateAsync(emailId);
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
      // Special case: Snoozed requires time selection
      if (targetColumnId === "snoozed") {
        setEmailToSnooze(emailId);
        setSnoozeModalOpen(true);
        return;
      }

      // Use config columns if available, otherwise fallback to defaults
      const columns = isInitialized ? configColumns : DEFAULT_KANBAN_COLUMNS;

      // Find target column to get backend status and Gmail label
      const targetColumn = columns.find(col => col.id === targetColumnId);
      if (!targetColumn) return;

      // In Kanban view: update status with optional Gmail label
      if (viewMode === "kanban") {
        updateStatusMutation.mutate({
          emailId,
          status: targetColumn.status, // Send backend status: INBOX, TODO, etc.
          gmailLabelId: ('gmailLabelId' in targetColumn) ? (targetColumn.gmailLabelId as string | null) : null // Send Gmail label ID if mapped
        });
      }
      // In List view: move to Gmail folder
      else {
        moveMutation.mutate({ emailId, folder: targetColumnId });
      }
    },
    [viewMode, moveMutation, updateStatusMutation, isInitialized, configColumns]
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to toggle view
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        toggleViewMode();
      }
      // Ctrl+N or Cmd+N to compose new email
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setComposeMode({ type: "new" });
        setShowCompose(true);
      }
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to close modals/details/search
      if (e.key === "Escape") {
        if (showCompose) {
          setShowCompose(false);
          setComposeMode({ type: "new" });
        } else if (showMobileDetail) {
          setShowMobileDetail(false);
        } else if (deleteModalOpen) {
          setDeleteModalOpen(false);
        } else if (isSearchMode) {
          // Clear search when ESC is pressed and nothing else is open
          handleClearSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleViewMode, showCompose, showMobileDetail, deleteModalOpen, isSearchMode, handleClearSearch]);

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
      className={`h-screen flex flex-col bg-gray-50 ${
        isResizing ? "cursor-col-resize select-none" : ""
      }`}
    >
      {/* Gmail-style Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-3 py-2 flex items-center justify-between gap-3">
          {/* Left Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setShowSidebar(!showSidebar);
                } else {
                  setShowMobileMenu(true);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden lg:block"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            <Mail className="w-7 h-7 text-blue-600 hidden sm:block" />
            <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
              Email Dashboard
            </h1>
          </div>

          {/* Search Bar */}
          <SearchBar
            query={searchQuery}
            onQueryChange={handleSearchInputChange}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            suggestions={suggestions}
            className="flex-1 max-w-2xl hidden md:block"
          />

          {/* View Toggle */}
          <ViewToggle className="ml-4" />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "U"}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:inline">
                {user?.name || user?.email}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden md:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <div
          className={`hidden lg:flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
            showSidebar ? "w-56" : "w-16"
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
              className={`relative flex-shrink-0 flex flex-col bg-white border-r border-gray-200 ${
                showMobileDetail ? "hidden" : "flex"
              } lg:flex`}
              style={{ width: `${emailListWidth}px` }}
            >
              {/* Bulk Actions Bar */}
              {selectedEmails.size > 0 && (
                <div className="flex items-center justify-center gap-4 px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedEmails.size} selected
                  </span>
                  <button
                    onClick={handleMarkBulkAsRead}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="Mark as read"
                  >
                    <MailOpen className="w-5 h-5 text-blue-700" />
                  </button>
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
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Search results for "{debouncedSearchQuery}"
                      </p>
                      {!isLoadingEmails && (
                        <p className="text-xs text-blue-700 mt-1">
                          {emails.length} {emails.length === 1 ? 'email' : 'emails'} found
                          {emailsData?.pages?.[0]?.pagination && 
                            ` (${(emailsData.pages[0].pagination as { total?: number }).total || 0} total)`
                          }
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleClearSearch}
                      className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear (ESC)
                    </button>
                  </div>
                </div>
              )}

              {/* Email List Content */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingEmails ? (
                  <EmailListSkeleton />
                ) : isGmailNotConnected ? (
                  <div className="p-8 text-center">
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
                ) : emails.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {isSearchMode && debouncedSearchQuery.length >= 3
                        ? `No results for "${debouncedSearchQuery}"`
                        : "No emails found"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {isSearchMode && debouncedSearchQuery.length >= 3
                        ? "Try a different search query or check your spelling"
                        : "This folder is empty"}
                    </p>
                    {isSearchMode && debouncedSearchQuery.length >= 3 && (
                      <button
                        onClick={handleClearSearch}
                        className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Back to {activeFolder}
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

              {/* Resize Handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                onMouseDown={handleMouseDown}
              />
            </div>

            {/* Email Detail */}
            <div
              className={`flex-1 bg-white overflow-hidden flex ${
                !showMobileDetail && "hidden lg:flex"
              }`}
            >
              {/* Main Email Detail Content */}
              <div className="flex-1 overflow-y-auto">
                {selectedEmail ? (
                  <>
                    {/* AI Button - Top Right Corner */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex justify-end">
                      <button
                        onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
                        className={`p-2 rounded-lg transition-all ${
                          isAiSidebarOpen
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                            : "hover:bg-gray-100 text-gray-700 hover:text-purple-600"
                        }`}
                        title="AI Summary (Powered by Gemini)"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <EmailDetail
                      email={selectedEmail}
                      onReply={handleReply}
                      onForward={handleForward}
                      onClose={handleBackToList}
                    />
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Mail className="w-24 h-24 mx-auto mb-4 opacity-20" />
                      <p className="text-lg">Select an email to read</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Sidebar */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-l-2 border-purple-300 ${
                  isAiSidebarOpen && selectedEmail ? "w-96" : "w-0"
                }`}
              >
                {isAiSidebarOpen && selectedEmail && (
                  <div className="w-96 h-full p-4">
                    <div className="sticky top-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 pb-2 mb-4 border-b-2 border-purple-300 z-10">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-800">AI Space</h3>
                      </div>
                    </div>
                    <EmailSummaryCard emailId={selectedEmail.id} summary={selectedEmail.aiSummary} />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // Kanban View
          <div
            className={`flex-1 bg-white overflow-hidden ${
              showMobileDetail ? "hidden" : "flex"
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
                columns={DEFAULT_KANBAN_COLUMNS}
                onCardClick={handleKanbanCardClick}
                onCardStar={handleToggleStar}
                onEmailMove={handleEmailMove}
                selectedEmailId={selectedEmail?.id || null}
                onLoadMore={kanbanData.hasMore ? kanbanData.loadMore : undefined}
                isLoadingMore={kanbanData.isLoading}
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
