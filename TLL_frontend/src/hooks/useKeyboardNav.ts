import { useEffect } from "react";
import type { Email } from "../types/email.types";

interface KeyboardNavActions {
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onDelete?: (emailId: string) => void;
  onArchive?: (emailId: string) => void;
  onToggleStar?: (emailId: string) => void;
}

/**
 * Custom hook cho Gmail-style keyboard shortcuts
 * j/k = navigation, r = reply, f = forward, s = star, # = delete, e = archive
 */
export const useKeyboardNav = (
  emails: Email[],
  selectedEmailId: string | null,
  onEmailSelect: (emailId: string) => void,
  actions: KeyboardNavActions
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);
      const selectedEmail = selectedEmailId
        ? emails.find((e) => e.id === selectedEmailId)
        : null;

      switch (e.key.toLowerCase()) {
        case "j": // Next email
        case "arrowdown":
          e.preventDefault();
          if (currentIndex < emails.length - 1) {
            onEmailSelect(emails[currentIndex + 1].id);
          }
          break;

        case "k": // Previous email
        case "arrowup":
          e.preventDefault();
          if (currentIndex > 0) {
            onEmailSelect(emails[currentIndex - 1].id);
          }
          break;

        case "enter": // Open/Select email
        case "o":
          e.preventDefault();
          if (selectedEmailId) {
            onEmailSelect(selectedEmailId);
          } else if (emails.length > 0) {
            onEmailSelect(emails[0].id);
          }
          break;

        case "r": // Reply
          e.preventDefault();
          if (selectedEmail && actions.onReply) {
            actions.onReply(selectedEmail);
          }
          break;

        case "f": // Forward
          e.preventDefault();
          if (selectedEmail && actions.onForward) {
            actions.onForward(selectedEmail);
          }
          break;

        case "s": // Toggle star
          e.preventDefault();
          if (selectedEmailId && actions.onToggleStar) {
            actions.onToggleStar(selectedEmailId);
          }
          break;

        case "#": // Delete (Gmail uses #)
          e.preventDefault();
          if (selectedEmailId && actions.onDelete) {
            actions.onDelete(selectedEmailId);
          }
          break;

        case "e": // Archive
          e.preventDefault();
          if (selectedEmailId && actions.onArchive) {
            actions.onArchive(selectedEmailId);
          }
          break;

        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [emails, selectedEmailId, onEmailSelect, actions]);
};
