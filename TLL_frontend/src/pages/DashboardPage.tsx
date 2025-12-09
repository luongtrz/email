import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Menu,
  Search,
  Mail,
  X,
  Trash2,
  MailOpen,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { FolderList } from "../components/email/FolderList";
import { EmailList } from "../components/email/EmailList";
import { EmailListSkeleton } from "../components/email/EmailListSkeleton";
import { EmailDetail } from "../components/email/EmailDetail";
import { ComposeModal } from "../components/email/ComposeModal";
import { DeleteConfirmModal } from "../components/modals/DeleteConfirmModal";
import { ErrorMessage } from "../components/common";
import type { Email } from "../types/email.types";

// ========== REACT QUERY HOOKS ==========
import {
  useInfiniteEmailsQuery,
  useMailboxesQuery,
  useMarkEmailReadMutation,
  useStarEmailMutation,
  useDeleteEmailMutation,
} from "../hooks/queries/useEmailsQuery";

// ========== OTHER CUSTOM HOOKS ==========
import { useResizable } from "../hooks/useResizable";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useOutsideClick } from "../hooks/useOutsideClick";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // ========== BASIC STATE ==========
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");

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

  // ========== REACT QUERY HOOKS ==========
  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    error: emailsError,
    refetch: refetchEmails,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteEmailsQuery(activeFolder, searchQuery);

  const {
    data: folders = [],
    error: foldersError,
    refetch: refetchFolders,
  } = useMailboxesQuery();

  const markReadMutation = useMarkEmailReadMutation();
  const starMutation = useStarEmailMutation();
  const deleteMutation = useDeleteEmailMutation();

  // Extract emails from infinite query data
  const emails = emailsData?.pages.flatMap((page) => page.emails) || [];

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
  const gmailNotConnected =
    (emailsError as any)?.response?.data?.message?.includes(
      "Gmail account not connected"
    ) || false;

  // ========== EMAIL SELECTION HANDLER ==========
  const handleEmailSelect = useCallback(
    async (emailId: string) => {
      const email = emails.find((e) => e.id === emailId);
      if (email) {
        setSelectedEmail(email);
        setShowMobileDetail(true);

        // Mark as read with optimistic update
        if (!email.read) {
          markReadMutation.mutate({ emailId, read: true });
        }
      }
    },
    [emails, markReadMutation]
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

  const handleDeleteEmail = useCallback(
    (emailId: string) => {
      setEmailToDelete(emailId);
      setIsBulkDelete(false);
      setDeleteModalOpen(true);
    },
    []
  );

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

  // ========== COMPOSE HANDLERS ==========
  const handleReply = useCallback((email: Email) => {
    setComposeMode({ type: "reply", email });
    setShowCompose(true);
  }, []);

  const handleForward = useCallback((email: Email) => {
    setComposeMode({ type: "forward", email });
    setShowCompose(true);
  }, []);

  // ========== FOLDER CHANGE HANDLER ==========
  const handleFolderChange = useCallback(
    (folderId: string) => {
      setActiveFolder(folderId);
      setSelectedEmail(null);
      setSelectedEmails(new Set());
      setShowMobileMenu(false);
    },
    []
  );

  // ========== SEARCH HANDLER ==========
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // React Query will auto-refetch when searchQuery changes
  }, []);

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

  // ========== AUTO-LOGOUT ON AUTH ERROR ==========
  useEffect(() => {
    if (foldersError && !gmailNotConnected) {
      const error = foldersError as any;
      if (error?.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
      }
    }
  }, [foldersError, gmailNotConnected, logout, navigate]);

  // ========== ERROR DISPLAY ==========
  if (foldersError && !gmailNotConnected) {
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

  if (emailsError && !gmailNotConnected) {
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
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-2xl hidden md:block"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </form>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user as any)?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:inline">
                {(user as any)?.fullName || user?.email}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden md:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {(user as any)?.fullName || user?.email}
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

        {/* Email List */}
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

          {/* Email List Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingEmails ? (
              <EmailListSkeleton />
            ) : gmailNotConnected ? (
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
                <p className="text-lg font-medium">No emails found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery
                    ? "Try a different search query"
                    : "This folder is empty"}
                </p>
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
          className={`flex-1 bg-white overflow-y-auto ${
            !showMobileDetail && "hidden lg:block"
          }`}
        >
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onReply={handleReply}
              onForward={handleForward}
              onClose={handleBackToList}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail className="w-24 h-24 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Select an email to read</p>
              </div>
            </div>
          )}
        </div>
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
