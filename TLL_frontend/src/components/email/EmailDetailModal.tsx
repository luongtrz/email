import React, { useState, useEffect } from "react";
import { DeleteConfirmModal } from "../modals/DeleteConfirmModal";
import { EmailDetailHeader } from "./detail/EmailDetailHeader";
import { EmailDetailSender } from "./detail/EmailDetailSender";
import { EmailDetailBody } from "./detail/EmailDetailBody";
import { EmailDetailAttachments } from "./detail/EmailDetailAttachments";
import { EmailSummaryCard } from "./EmailSummaryCard";
import type { Email } from "../../types/email.types";
import { emailService } from "../../services/email.service";
import { useEmailDetailQuery } from "../../hooks/queries/useEmailsQuery";
import toast from "react-hot-toast";
import { Sparkles, X } from "lucide-react";

interface EmailDetailModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onEmailUpdated?: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  // Navigation props
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalEmails?: number;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  email,
  isOpen,
  onClose,
  onEmailUpdated,
  onReply,
  onForward,
  canGoPrevious = false,
  canGoNext = false,
  onPrevious,
  onNext,
  currentIndex,
  totalEmails,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

  // Fetch full email detail when modal opens
  const { 
    data: fullEmail, 
    isLoading: isLoadingDetail,
    error: detailError 
  } = useEmailDetailQuery(email?.id || null);

  // Use full email if available, fallback to preview email
  const displayEmail = fullEmail || email;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent navigation if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowRight":
          if (canGoNext && onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "ArrowLeft":
          if (canGoPrevious && onPrevious) {
            e.preventDefault();
            onPrevious();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, canGoNext, canGoPrevious, onNext, onPrevious, onClose]);

  const handleArchive = async () => {
    if (!displayEmail) return;
    setIsActionLoading(true);
    try {
      await emailService.modifyEmail(displayEmail.id, { archive: true });
      toast.success("Email archived");
      onEmailUpdated?.();
      onClose();
    } catch {
      toast.error("Failed to archive email");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStar = async () => {
    if (!displayEmail) return;
    setIsActionLoading(true);
    try {
      await emailService.modifyEmail(displayEmail.id, { star: !displayEmail.starred });
      toast.success(displayEmail.starred ? "Removed star" : "Starred");
      onEmailUpdated?.();
    } catch {
      toast.error("Failed to update star");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    if (!displayEmail) return;
    try {
      const blob = await emailService.downloadAttachment(
        attachmentId,
        displayEmail.id
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachmentId;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Failed to download attachment");
    }
  };

  const handleConfirmDelete = async () => {
    if (!displayEmail) return;
    setIsDeleting(true);
    try {
      await emailService.modifyEmail(displayEmail.id, { delete: true });
      toast.success("Email deleted");
      setDeleteModalOpen(false);
      onEmailUpdated?.();
      onClose();
    } catch {
      toast.error("Failed to delete email");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
        <div
          className={`bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300 ${
            isAiSidebarOpen ? "w-[95vw] max-w-[1400px]" : "w-full max-w-5xl"
          } max-h-[90vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header with Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className={`p-2 rounded-lg transition-colors ${
                  canGoPrevious
                    ? "hover:bg-gray-200 text-gray-700"
                    : "text-gray-300 cursor-not-allowed"
                }`}
                title="Previous email (←)"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Next Button */}
              <button
                onClick={onNext}
                disabled={!canGoNext}
                className={`p-2 rounded-lg transition-colors ${
                  canGoNext
                    ? "hover:bg-gray-200 text-gray-700"
                    : "text-gray-300 cursor-not-allowed"
                }`}
                title="Next email (→)"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* Email counter */}
              {currentIndex !== undefined && totalEmails !== undefined && (
                <span className="text-sm text-gray-600 ml-2">
                  {currentIndex + 1} of {totalEmails}
                </span>
              )}
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Gemini AI Button */}
              <button
                onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
                className={`p-2 rounded-lg transition-all ${
                  isAiSidebarOpen
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                    : "hover:bg-gray-200 text-gray-700 hover:text-purple-600"
                }`}
                title="AI (Powered by Gemini)"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-700 transition-colors"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Email Content - Two column layout with AI sidebar */}
          {email ? (
            <div className="flex-1 overflow-hidden flex">
              {/* Main Email Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <EmailDetailHeader
                  email={email}
                  isActionLoading={isActionLoading}
                  onArchive={handleArchive}
                  onDelete={() => setDeleteModalOpen(true)}
                  onStar={handleStar}
                  onReply={onReply}
                  onForward={onForward}
                  onClose={undefined} // Don't show close button in header since we have it in modal header
                />

                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <div className="max-w-4xl mx-auto p-4 sm:p-6">
                    {isLoadingDetail ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      </div>
                    ) : displayEmail ? (
                      <>
                        <h1 className="text-xl sm:text-2xl font-normal text-gray-900 mb-4">
                          {displayEmail.subject}
                        </h1>

                        <EmailDetailSender email={displayEmail} />

                        {displayEmail.attachments && displayEmail.attachments.length > 0 && (
                          <EmailDetailAttachments
                            attachments={displayEmail.attachments}
                            onDownload={handleDownloadAttachment}
                            isLoading={isActionLoading}
                          />
                        )}

                        <EmailDetailBody body={displayEmail.body} />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        Failed to load email
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Sidebar - Slides in from right */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-l-2 border-purple-300 ${
                  isAiSidebarOpen ? "w-96" : "w-0"
                }`}
              >
                {isAiSidebarOpen && (
                  <div className="w-96 h-full p-4">
                    <div className="sticky top-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 pb-2 mb-4 border-b-2 border-purple-300 z-10">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-800">AI Space</h3>
                      </div>
                    </div>
                    {displayEmail && (
                      <EmailSummaryCard emailId={displayEmail.id} summary={displayEmail.aiSummary} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">No email selected</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete email?"
        message="This email will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </>
  );
};
