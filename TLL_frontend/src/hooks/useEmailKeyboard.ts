import { useEffect, useCallback, useRef } from "react";
import type { Email } from "../types/email.types";

interface UseEmailKeyboardProps {
  emails: Email[];
  selectedEmailId: string | null;
  selectedEmails: Set<string>;
  onEmailSelect: (emailId: string) => void;
  onEmailToggle?: (emailId: string, checked: boolean) => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onDelete?: (emailId: string) => void;
  onArchive?: (emailId: string) => void;
  onToggleStar?: (emailId: string) => void;
}

export const useEmailKeyboard = ({
  emails,
  selectedEmailId,
  selectedEmails,
  onEmailSelect,
  onEmailToggle,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onToggleStar,
}: UseEmailKeyboardProps) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedIndex = emails.findIndex((e) => e.id === selectedEmailId);

  const scrollToEmail = useCallback((emailId: string) => {
    const element = itemRefs.current.get(emailId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!selectedEmailId || emails.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          if (selectedIndex < emails.length - 1) {
            const nextEmail = emails[selectedIndex + 1];
            onEmailSelect(nextEmail.id);
            scrollToEmail(nextEmail.id);
          }
          break;

        case "ArrowUp":
        case "k":
          e.preventDefault();
          if (selectedIndex > 0) {
            const prevEmail = emails[selectedIndex - 1];
            onEmailSelect(prevEmail.id);
            scrollToEmail(prevEmail.id);
          }
          break;

        case "r":
          e.preventDefault();
          if (onReply) {
            const email = emails.find((e) => e.id === selectedEmailId);
            if (email) onReply(email);
          }
          break;

        case "f":
          e.preventDefault();
          if (onForward) {
            const email = emails.find((e) => e.id === selectedEmailId);
            if (email) onForward(email);
          }
          break;

        case "Delete":
        case "d":
          e.preventDefault();
          if (onDelete) {
            onDelete(selectedEmailId);
          }
          break;

        case "e":
          e.preventDefault();
          if (onArchive) {
            onArchive(selectedEmailId);
          }
          break;

        case "s":
          e.preventDefault();
          if (onToggleStar) {
            onToggleStar(selectedEmailId);
          }
          break;

        case "x":
          e.preventDefault();
          if (onEmailToggle) {
            const isSelected = selectedEmails.has(selectedEmailId);
            onEmailToggle(selectedEmailId, !isSelected);
          }
          break;
      }
    },
    [
      emails,
      selectedEmailId,
      selectedIndex,
      selectedEmails,
      onEmailSelect,
      onEmailToggle,
      onReply,
      onForward,
      onDelete,
      onArchive,
      onToggleStar,
      scrollToEmail,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const registerItem = useCallback((emailId: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(emailId, element);
    } else {
      itemRefs.current.delete(emailId);
    }
  }, []);

  return { registerItem };
};
