import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Archive,
  Trash2,
  Star,
  MoreVertical,
  Download,
  Paperclip,
  ChevronLeft,
  Reply,
  Forward,
} from "lucide-react";
import { emailService } from "../../services/email.service";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { Email } from "../../types/email.types";

interface EmailDetailProps {
  email: Email | null;
  onClose?: () => void;
  onEmailUpdated?: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onClose,
  onEmailUpdated,
  onReply,
  onForward,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!email) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-blue-500"
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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No email selected
          </h3>
          <p className="text-gray-600">
            Select an email from the list to view its content
          </p>
        </div>
      </div>
    );
  }

  const formatFullDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadAttachment = async (
    attachmentId: string,
    filename: string
  ) => {
    try {
      setIsActionLoading(true);
      const blob = await emailService.downloadAttachment(
        email.id,
        attachmentId
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error("Failed to download attachment:", error);
      toast.error("Failed to download attachment");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await emailService.modifyEmail(email.id, { delete: true });
      toast.success("Email deleted");
      setDeleteModalOpen(false);
      onEmailUpdated?.();
      onClose?.();
    } catch {
      toast.error("Failed to delete email");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header with Actions - Gmail style compact */}
      <div className="border-b border-gray-200 flex-shrink-0">
        {/* Mobile Back Button */}
        {onClose && (
          <div className="lg:hidden px-3 py-2 border-b border-gray-100">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
          </div>
        )}

        {/* Action Bar - Compact Gmail style */}
        <div className="px-4 py-2 flex items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                setIsActionLoading(true);
                try {
                  await emailService.modifyEmail(email.id, { archive: true });
                  toast.success("Email archived");
                  onEmailUpdated?.();
                } catch (error) {
                  console.error("Failed to archive:", error);
                  toast.error("Failed to archive");
                } finally {
                  setIsActionLoading(false);
                }
              }}
              disabled={isActionLoading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Archive"
            >
              <Archive className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              disabled={isActionLoading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={async () => {
                setIsActionLoading(true);
                try {
                  await emailService.modifyEmail(
                    email.id,
                    email.starred ? { unstar: true } : { star: true }
                  );
                  toast.success(email.starred ? "Removed star" : "Added star");
                  onEmailUpdated?.();
                } catch (error) {
                  console.error("Failed to toggle star:", error);
                  toast.error("Failed to update");
                } finally {
                  setIsActionLoading(false);
                }
              }}
              disabled={isActionLoading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Star"
            >
              <Star
                className={`w-5 h-5 ${
                  email.starred
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-gray-700"
                }`}
              />
            </button>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Reply Button */}
            {onReply && (
              <button
                onClick={() => onReply(email)}
                disabled={isActionLoading}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Reply"
              >
                <Reply className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Forward Button */}
            {onForward && (
              <button
                onClick={() => onForward(email)}
                disabled={isActionLoading}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Forward"
              >
                <Forward className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowMore(!showMore)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="More"
          >
            <MoreVertical className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Email Content - Gmail compact style */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          {/* Subject */}
          <h1 className="text-xl sm:text-2xl font-normal text-gray-900 mb-4">
            {email.subject}
          </h1>

          {/* Sender Info - Compact */}
          <div className="flex items-start gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
              {email.from.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {email.from.name}
                </span>
                <span className="text-xs text-gray-500">
                  &lt;{email.from.email}&gt;
                </span>
              </div>
              <div className="text-sm text-gray-600">
                to {email.to.join(", ")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatFullDate(email.date)}
              </div>
            </div>
            {email.starred && (
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>

          {/* Attachments - Compact */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                <Paperclip className="w-4 h-4" />
                <span>
                  {email.attachments.length} attachment
                  {email.attachments.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((attachment, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      handleDownloadAttachment(
                        attachment.id || "",
                        attachment.filename
                      )
                    }
                    disabled={isActionLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
                  >
                    <Paperclip className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900 truncate max-w-[200px]">
                      {attachment.filename}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {attachment.size}
                    </span>
                    <Download className="w-3 h-3 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email Body - Compact with forced light mode */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div
              className="prose prose-sm max-w-none text-gray-800 [&_*]:!text-gray-800 [&_*]:!bg-transparent"
              style={{
                colorScheme: "light",
              }}
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          </div>
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
        onCancel={handleCancelDelete}
      />
    </div>
  );
};
