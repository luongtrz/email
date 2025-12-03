import React, { useState, useEffect, useRef } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import { emailService } from "../services/email.service";
import { FolderList } from "../components/email/FolderList";
import { EmailList } from "../components/email/EmailList";
import { EmailListSkeleton } from "../components/email/EmailListSkeleton";
import { EmailDetail } from "../components/email/EmailDetail";
import { ComposeModal } from "../components/email/ComposeModal";
import { DeleteConfirmModal } from "../components/email/DeleteConfirmModal";
import type { Email, Folder } from "../types/email.types";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    limit: 20,
  });
  const [composeMode, setComposeMode] = useState<{
    type: "new" | "reply" | "forward";
    email?: Email;
  }>({ type: "new" });
  const [gmailNotConnected, setGmailNotConnected] = useState(false);
  const [emailListWidth, setEmailListWidth] = useState(() => {
    const availableWidth = window.innerWidth - (showSidebar ? 224 : 0) - 300;
    return Math.min(1080, Math.max(300, availableWidth * 0.6));
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isInitialMount = useRef(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const foldersData = await emailService.getMailboxes();
        if (isCancelled) return;
        setFolders(foldersData);
        setGmailNotConnected(false);

        const result = await emailService.getEmails({
          folder: activeFolder,
          search: searchQuery || undefined,
          page: 1,
          limit: 20,
        });
        if (isCancelled) return;
        setEmails(result.emails);
        setPagination(result.pagination);
      } catch (error: any) {
        if (!isCancelled) {
          console.error("Failed to load initial data:", error);

          // If 401 and not Gmail-specific error, redirect to login
          if (error.response?.status === 401) {
            if (
              error.response?.data?.message?.includes(
                "Gmail account not connected"
              )
            ) {
              setGmailNotConnected(true);
            } else {
              // Invalid token, force logout
              logout();
              navigate("/login", { replace: true });
              return;
            }
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          isInitialMount.current = false;
        }
      }
    };

    loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    loadEmails();
  }, [activeFolder, searchQuery]);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const result = await emailService.getEmails({
        folder: activeFolder,
        search: searchQuery || undefined,
        page: 1,
        limit: pagination.limit,
      });
      setEmails(result.emails);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to load emails:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreEmails = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;
      const result = await emailService.getEmails({
        folder: activeFolder,
        search: searchQuery || undefined,
        page: nextPage,
        limit: pagination.limit,
      });

      if (result.emails.length > 0) {
        setEmails((prev) => [...prev, ...result.emails]);
        setPagination(result.pagination);
        toast.success(`Loaded ${result.emails.length} more emails`);
      } else {
        toast.error("No more emails to load");
      }
    } catch (error) {
      console.error("Failed to load more emails:", error);
      toast.error("Failed to load more emails");
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  const handleFolderChange = (folderId: string) => {
    setActiveFolder(folderId);
    setShowMobileDetail(false);
    setShowMobileMenu(false);
    setSelectedEmails(new Set());
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmails();
  };

  const handleBulkDelete = () => {
    setIsBulkDelete(true);
    setDeleteModalOpen(true);
  };

  const handleBulkMarkRead = () => {
    setEmails((prev) =>
      prev.map((e) => (selectedEmails.has(e.id) ? { ...e, read: true } : e))
    );
    setSelectedEmails(new Set());
  };

  // Keyboard navigation handlers
  const handleReply = (email: Email) => {
    setComposeMode({ type: "reply", email });
    setShowCompose(true);
  };

  const handleForward = (email: Email) => {
    setComposeMode({ type: "forward", email });
    setShowCompose(true);
  };

  const handleDeleteEmail = (emailId: string) => {
    setEmailToDelete(emailId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      // Handle bulk deletion
      if (isBulkDelete && selectedEmails.size > 0) {
        const deletePromises = Array.from(selectedEmails).map((emailId) =>
          emailService.modifyEmail(emailId, { delete: true })
        );
        await Promise.all(deletePromises);

        // Remove deleted emails from the list
        setEmails((prev) => prev.filter((e) => !selectedEmails.has(e.id)));

        // Clear selected email if it was deleted
        if (selectedEmail && selectedEmails.has(selectedEmail.id)) {
          setSelectedEmail(null);
        }

        toast.success(
          `${selectedEmails.size} email${
            selectedEmails.size > 1 ? "s" : ""
          } deleted`
        );
        setSelectedEmails(new Set());
      }
      // Handle single email deletion
      else if (emailToDelete) {
        await emailService.modifyEmail(emailToDelete, { delete: true });
        setEmails((prev) => prev.filter((e) => e.id !== emailToDelete));

        if (selectedEmail?.id === emailToDelete) {
          setSelectedEmail(null);
        }

        toast.success("Email deleted");
        setEmailToDelete(null);
      }

      setDeleteModalOpen(false);
      setIsBulkDelete(false);
    } catch {
      toast.error("Failed to delete email(s)");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setEmailToDelete(null);
    setIsBulkDelete(false);
  };

  const handleArchiveEmail = async (emailId: string) => {
    try {
      await emailService.modifyEmail(emailId, { archive: true });
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      toast.success("Email archived");
    } catch (error) {
      console.error("Failed to archive email:", error);
      toast.error("Failed to archive email");
    }
  };

  const handleToggleStar = async (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (!email) return;

    // Optimistic update
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, starred: !e.starred } : e))
    );

    try {
      await emailService.modifyEmail(
        emailId,
        email.starred ? { unstar: true } : { star: true }
      );
    } catch (error) {
      // Rollback on error
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, starred: email.starred } : e
        )
      );
      toast.error("Failed to update star");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX - (showSidebar ? 224 : 0); // Subtract sidebar width
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

  // Close user menu when clicking outside
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
                  setShowMobileMenu(!showMobileMenu);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              <span className="hidden sm:inline text-xl font-normal text-gray-700">
                Email
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mail"
                className="w-full pl-10 pr-12 py-2 bg-gray-100 border border-transparent rounded-lg hover:bg-gray-200 hover:shadow-sm focus:outline-none focus:bg-white focus:shadow-md focus:border-gray-300 transition-all text-sm"
              />
            </div>
          </form>

          {/* Right Section - User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
              title={user?.email}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.fullName || user?.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar - Centered with clear labels */}
        {selectedEmails.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-200 flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedEmails.size} email{selectedEmails.size > 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
              >
                <MailOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Mark as read</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-100 text-red-700 rounded-lg transition-colors border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete</span>
              </button>
              <button
                onClick={() => setSelectedEmails(new Set())}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-300"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Clear</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fadeIn"
            onClick={() => setShowMobileMenu(false)}
          >
            <div
              className="w-72 h-full bg-white shadow-2xl animate-slideInLeft"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Mailboxes</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FolderList
                folders={folders}
                activeFolder={activeFolder}
                onFolderChange={handleFolderChange}
                onCompose={() => {
                  setComposeMode({ type: "new" });
                  setShowCompose(true);
                  setShowMobileMenu(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Sidebar - Folders */}
        <aside
          className={`
          hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 bg-white
          ${showSidebar ? "w-56" : "w-0 -ml-56"}
        `}
        >
          <FolderList
            folders={folders}
            activeFolder={activeFolder}
            onFolderChange={handleFolderChange}
            onCompose={() => {
              setComposeMode({ type: "new" });
              setShowCompose(true);
            }}
          />
        </aside>

        {/* Email List - Always visible on desktop with resizable width */}
        <div
          className="hidden lg:flex border-r border-gray-200 bg-white overflow-hidden"
          style={{
            width: `${emailListWidth}px`,
            minWidth: "300px",
            maxWidth: "1200px",
          }}
        >
          {isLoading ? (
            <EmailListSkeleton />
          ) : gmailNotConnected ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Connect Gmail
                </h3>
                <p className="text-sm text-gray-600">
                  Connect your Gmail account to start managing your emails
                </p>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No emails
                </h3>
                <p className="text-sm text-gray-600">
                  This folder is empty or no results match your search
                </p>
              </div>
            </div>
          ) : (
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmail?.id || null}
              onEmailSelect={handleEmailSelect}
              selectedEmails={selectedEmails}
              onEmailToggle={(emailId, checked) => {
                setSelectedEmails((prev) => {
                  const newSet = new Set(prev);
                  if (checked) {
                    newSet.add(emailId);
                  } else {
                    newSet.delete(emailId);
                  }
                  return newSet;
                });
              }}
              onLoadMore={loadMoreEmails}
              isLoadingMore={isLoadingMore}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDeleteEmail}
              onArchive={handleArchiveEmail}
              onToggleStar={handleToggleStar}
            />
          )}
        </div>

        {/* Resizable Divider - Desktop only */}
        <div
          className="hidden lg:block w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Email List - Mobile (hide when detail shown) */}
        <div
          className={`flex-1 lg:hidden border-r border-gray-200 bg-white ${
            showMobileDetail ? "hidden" : ""
          }`}
        >
          {isLoading ? (
            <EmailListSkeleton />
          ) : gmailNotConnected ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Connect Gmail
                </h3>
                <p className="text-sm text-gray-600">
                  Connect your Gmail account to start managing your emails
                </p>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No emails
                </h3>
                <p className="text-sm text-gray-600">
                  This folder is empty or no results match your search
                </p>
              </div>
            </div>
          ) : (
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmail?.id || null}
              onEmailSelect={handleEmailSelect}
              selectedEmails={selectedEmails}
              onEmailToggle={(emailId, checked) => {
                setSelectedEmails((prev) => {
                  const newSet = new Set(prev);
                  if (checked) {
                    newSet.add(emailId);
                  } else {
                    newSet.delete(emailId);
                  }
                  return newSet;
                });
              }}
              onLoadMore={loadMoreEmails}
              isLoadingMore={isLoadingMore}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDeleteEmail}
              onArchive={handleArchiveEmail}
              onToggleStar={handleToggleStar}
            />
          )}
        </div>

        {/* Email Detail - Mobile (full width when shown) */}
        <div
          className={`flex-1 lg:hidden bg-white ${
            showMobileDetail ? "" : "hidden"
          }`}
        >
          <EmailDetail
            email={selectedEmail}
            onClose={() => setShowMobileDetail(false)}
            onEmailUpdated={() => {
              loadEmails();
              setShowMobileDetail(false);
            }}
            onReply={handleReply}
            onForward={handleForward}
          />
        </div>

        {/* Email Detail - Desktop (always visible) */}
        <div className="hidden lg:flex lg:flex-1 bg-white overflow-hidden">
          <EmailDetail
            email={selectedEmail}
            onClose={() => setShowMobileDetail(false)}
            onEmailUpdated={() => {
              loadEmails();
              setShowMobileDetail(false);
            }}
            onReply={handleReply}
            onForward={handleForward}
          />
        </div>
      </div>

      {/* Floating Compose Button - Mobile Only */}
      <button
        onClick={() => {
          setComposeMode({ type: "new" });
          setShowCompose(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-30 flex items-center justify-center"
        aria-label="Compose"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => {
            loadEmails();
            setShowCompose(false);
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
        title={
          isBulkDelete
            ? `Delete ${selectedEmails.size} email${
                selectedEmails.size > 1 ? "s" : ""
              }?`
            : "Delete email?"
        }
        message={
          isBulkDelete
            ? `${selectedEmails.size} email${
                selectedEmails.size > 1 ? "s" : ""
              } will be moved to the Trash folder. You can restore them later if needed.`
            : "This email will be moved to the Trash folder. You can restore it later if needed."
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};
