import { emailService } from "../services/email.service";
import type { Email } from "../types/email.types";
import toast from "react-hot-toast";

interface UseEmailActionsOptions {
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  selectedEmail?: Email | null;
  setSelectedEmail?: React.Dispatch<React.SetStateAction<Email | null>>;
}

interface UseEmailActionsReturn {
  markAsRead: (emailId: string) => Promise<void>;
  toggleStar: (emailId: string) => Promise<void>;
  archiveEmail: (emailId: string) => Promise<void>;
  deleteEmail: (emailId: string) => Promise<void>;
  deleteBulk: (emailIds: string[]) => Promise<void>;
  markBulkAsRead: (emailIds: string[]) => Promise<void>;
}

/**
 * Custom hook để quản lý tất cả email actions
 * Bao gồm: mark as read, star, archive, delete với optimistic updates
 */
export const useEmailActions = ({
  emails,
  setEmails,
  selectedEmail,
  setSelectedEmail,
}: UseEmailActionsOptions): UseEmailActionsReturn => {
  /**
   * Mark email as read với optimistic update
   */
  const markAsRead = async (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (!email || email.read) return;

    // Optimistic update
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
      console.error("Failed to mark as read:", error);
      throw error;
    }
  };

  /**
   * Toggle star với optimistic update
   */
  const toggleStar = async (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (!email) return;

    const newStarredState = !email.starred;

    // Optimistic update
    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId ? { ...e, starred: newStarredState } : e
      )
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
      console.error("Failed to toggle star:", error);
      throw error;
    }
  };

  /**
   * Archive email
   */
  const archiveEmail = async (emailId: string) => {
    try {
      await emailService.modifyEmail(emailId, { archive: true });
      
      // Remove from list
      setEmails((prev) => prev.filter((e) => e.id !== emailId));

      // Clear selected email if it was archived
      if (selectedEmail?.id === emailId && setSelectedEmail) {
        setSelectedEmail(null);
      }

      toast.success("Email archived");
    } catch (error) {
      console.error("Failed to archive email:", error);
      toast.error("Failed to archive email");
      throw error;
    }
  };

  /**
   * Delete single email
   */
  const deleteEmail = async (emailId: string) => {
    try {
      await emailService.modifyEmail(emailId, { delete: true });
      
      // Remove from list
      setEmails((prev) => prev.filter((e) => e.id !== emailId));

      // Clear selected email if it was deleted
      if (selectedEmail?.id === emailId && setSelectedEmail) {
        setSelectedEmail(null);
      }

      toast.success("Email deleted");
    } catch (error) {
      console.error("Failed to delete email:", error);
      toast.error("Failed to delete email");
      throw error;
    }
  };

  /**
   * Delete multiple emails
   */
  const deleteBulk = async (emailIds: string[]) => {
    try {
      const deletePromises = emailIds.map((emailId) =>
        emailService.modifyEmail(emailId, { delete: true })
      );
      await Promise.all(deletePromises);

      // Remove from list
      setEmails((prev) => prev.filter((e) => !emailIds.includes(e.id)));

      // Clear selected email if it was deleted
      if (
        selectedEmail &&
        emailIds.includes(selectedEmail.id) &&
        setSelectedEmail
      ) {
        setSelectedEmail(null);
      }

      toast.success(
        `${emailIds.length} email${emailIds.length > 1 ? "s" : ""} deleted`
      );
    } catch (error) {
      console.error("Failed to delete emails:", error);
      toast.error("Failed to delete email(s)");
      throw error;
    }
  };

  /**
   * Mark multiple emails as read
   */
  const markBulkAsRead = async (emailIds: string[]) => {
    // Optimistic update
    setEmails((prev) =>
      prev.map((e) => (emailIds.includes(e.id) ? { ...e, read: true } : e))
    );

    try {
      const promises = emailIds.map((emailId) =>
        emailService.markAsRead(emailId)
      );
      await Promise.all(promises);
    } catch (error) {
      // Rollback on error
      setEmails((prev) =>
        prev.map((e) => {
          if (emailIds.includes(e.id)) {
            const original = emails.find((orig) => orig.id === e.id);
            return original ? { ...e, read: original.read } : e;
          }
          return e;
        })
      );
      toast.error("Failed to mark as read");
      console.error("Failed to mark bulk as read:", error);
      throw error;
    }
  };

  return {
    markAsRead,
    toggleStar,
    archiveEmail,
    deleteEmail,
    deleteBulk,
    markBulkAsRead,
  };
};
