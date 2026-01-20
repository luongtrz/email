import { useEffect } from "react";

interface KeyboardShortcuts {
  toggleView?: () => void;
  createEmail?: () => void;
  searchFocus?: () => void;
  escape?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in input/textarea
      // EXCEPT for Escape key which should always work
      if (
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) &&
        event.key !== "Escape"
      ) {
        return;
      }

      // Ctrl/Cmd + K: Toggle view
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        shortcuts.toggleView?.();
      }

      // Ctrl/Cmd + N: Create new email
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        shortcuts.createEmail?.();
      }

      // Ctrl/Cmd + /: Focus search (changed from F to avoid conflict with Forward)
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        shortcuts.searchFocus?.();
      }

      // Escape: Close modals/details
      if (event.key === "Escape") {
        shortcuts.escape?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};
