import { useState, useCallback, useEffect } from "react";
import type { Email } from "../types/email.types";

interface UseEmailNavigationProps {
  emails: Email[];
  onClose?: () => void;
}

interface UseEmailNavigationReturn {
  selectedEmail: Email | null;
  selectedIndex: number;
  isOpen: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  openEmail: (email: Email) => void;
  closeModal: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
}

/**
 * Custom hook for managing email navigation in modal
 * Handles opening, closing, and navigating between emails
 */
export const useEmailNavigation = ({
  emails,
  onClose,
}: UseEmailNavigationProps): UseEmailNavigationReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const selectedEmail = selectedIndex >= 0 ? emails[selectedIndex] : null;
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < emails.length - 1;

  // Open email by finding its index
  const openEmail = useCallback(
    (email: Email) => {
      const index = emails.findIndex((e) => e.id === email.id);
      if (index !== -1) {
        setSelectedIndex(index);
        setIsOpen(true);
      }
    },
    [emails]
  );

  // Close modal and reset
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  }, [onClose]);

  // Navigate to next email
  const goToNext = useCallback(() => {
    if (canGoNext) {
      setSelectedIndex((prev) => prev + 1);
    }
  }, [canGoNext]);

  // Navigate to previous email
  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      setSelectedIndex((prev) => prev - 1);
    }
  }, [canGoPrevious]);

  // Navigate to specific index
  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < emails.length) {
        setSelectedIndex(index);
      }
    },
    [emails.length]
  );

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
          closeModal();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToPrevious();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal, goToNext, goToPrevious]);

  // Update selected index if emails list changes
  useEffect(() => {
    if (selectedEmail && emails.length > 0) {
      const newIndex = emails.findIndex((e) => e.id === selectedEmail.id);
      if (newIndex !== -1 && newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);
      } else if (newIndex === -1) {
        // Email was removed from list
        closeModal();
      }
    }
  }, [emails, selectedEmail, selectedIndex, closeModal]);

  return {
    selectedEmail,
    selectedIndex,
    isOpen,
    canGoPrevious,
    canGoNext,
    openEmail,
    closeModal,
    goToNext,
    goToPrevious,
    goToIndex,
  };
};
