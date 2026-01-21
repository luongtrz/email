import React, { useState } from "react";
import { DeleteConfirmModal } from "../modals/DeleteConfirmModal";
import { EmailDetailHeader } from "./detail/EmailDetailHeader";
import { EmailDetailSender } from "./detail/EmailDetailSender";
import { EmailDetailBody } from "./detail/EmailDetailBody";
import { EmailDetailAttachments } from "./detail/EmailDetailAttachments";
import type { Email } from "../../types/email.types";
import { emailService } from "../../services/email.service";
import { useStarEmailMutation } from "../../hooks/queries/useEmailsQuery";
import toast from "react-hot-toast";

interface EmailDetailProps {
  email: Email | null;
  onClose?: () => void;
  onEmailUpdated?: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onToggleAi?: () => void;
  isAiOpen?: boolean;
  currentFolder?: string;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onClose,
  onEmailUpdated,
  onReply,
  onForward,
  onToggleAi,
  isAiOpen,
  currentFolder,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use mutation for optimistic update
  const starMutation = useStarEmailMutation();

  const handleArchive = async () => {
    if (!email) return;
    setIsActionLoading(true);
    try {
      await emailService.modifyEmail(email.id, { archive: true });
      toast.success("Đã lưu trữ email");
      onEmailUpdated?.();
      onClose?.();
    } catch {
      toast.error("Không thể lưu trữ email");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStar = () => {
    if (!email) return;
    // Use mutation for optimistic update - UI updates immediately
    starMutation.mutate(
      { emailId: email.id, starred: !email.starred },
      {
        onSuccess: () => {
          onEmailUpdated?.();
        }
      }
    );
  };

  const handleDownloadAttachment = async (attachmentId: string, filename?: string) => {
    if (!email) return;
    try {
      const blob = await emailService.downloadAttachment(
        attachmentId,
        email.id
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "attachment";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Không thể tải tệp đính kèm");
    }
  };

  const handleConfirmDelete = async () => {
    if (!email) return;
    setIsDeleting(true);
    try {
      const isPermanent = currentFolder === 'trash';
      await emailService.modifyEmail(email.id, {
        permanentDelete: isPermanent,
        delete: !isPermanent
      });
      toast.success(
        isPermanent
          ? "Email đã bị xóa vĩnh viễn"
          : "Email đã được chuyển vào Thùng rác"
      );
      setDeleteModalOpen(false);
      onEmailUpdated?.();
      onClose?.();
    } catch {
      toast.error("Không thể xóa email");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!email) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center max-w-md p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
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
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No email selected
          </h3>
          <p className="text-gray-600 dark:text-slate-400">
            Select an email from the list to view its content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col bg-white dark:bg-slate-900">
      <EmailDetailHeader
        email={email}
        isActionLoading={isActionLoading || starMutation.isPending}
        onArchive={handleArchive}
        onDelete={() => setDeleteModalOpen(true)}
        onStar={handleStar}
        onReply={onReply}
        onForward={onForward}
        onClose={onClose}
        onToggleAi={onToggleAi}
        isAiOpen={isAiOpen}
      />

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-5">
            {email.subject}
          </h1>

          <EmailDetailSender email={email} />

          {email.attachments && email.attachments.length > 0 && (
            <EmailDetailAttachments
              attachments={email.attachments}
              onDownload={handleDownloadAttachment}
              isLoading={isActionLoading}
            />
          )}

          <EmailDetailBody body={email.body} />
        </div>
      </div>

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
    </div>
  );
};
