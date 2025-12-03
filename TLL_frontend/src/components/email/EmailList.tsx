import React, { useEffect, useRef, useCallback } from "react";
import { Star, Paperclip } from "lucide-react";
import type { Email } from "../../types/email.types";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  selectedEmails?: Set<string>;
  onEmailToggle?: (emailId: string, checked: boolean) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onDelete?: (emailId: string) => void;
  onArchive?: (emailId: string) => void;
  onToggleStar?: (emailId: string) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onEmailSelect,
  selectedEmails = new Set(),
  onEmailToggle,
  onLoadMore,
  isLoadingMore = false,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onToggleStar,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Find current selected index
  const selectedIndex = emails.findIndex((e) => e.id === selectedEmailId);

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentIndex = selectedIndex >= 0 ? selectedIndex : -1;

      switch (e.key.toLowerCase()) {
        case "j": // Next email
        case "arrowdown":
          e.preventDefault();
          if (currentIndex < emails.length - 1) {
            const nextEmail = emails[currentIndex + 1];
            onEmailSelect(nextEmail.id);
            itemRefs.current
              .get(nextEmail.id)
              ?.scrollIntoView({ block: "nearest" });
          }
          break;

        case "k": // Previous email
        case "arrowup":
          e.preventDefault();
          if (currentIndex > 0) {
            const prevEmail = emails[currentIndex - 1];
            onEmailSelect(prevEmail.id);
            itemRefs.current
              .get(prevEmail.id)
              ?.scrollIntoView({ block: "nearest" });
          }
          break;

        case "enter": // Open email
        case "o":
          e.preventDefault();
          if (selectedEmailId) {
            onEmailSelect(selectedEmailId);
          }
          break;

        case "r": // Reply
          e.preventDefault();
          if (selectedEmailId && onReply) {
            const email = emails.find((e) => e.id === selectedEmailId);
            if (email) onReply(email);
          }
          break;

        case "f": // Forward (Shift+F in Gmail, but we use just F for simplicity)
          if (!e.shiftKey) {
            e.preventDefault();
            if (selectedEmailId && onForward) {
              const email = emails.find((e) => e.id === selectedEmailId);
              if (email) onForward(email);
            }
          }
          break;

        case "delete":
        case "#": // Gmail shortcut for delete
          e.preventDefault();
          if (selectedEmailId && onDelete) {
            onDelete(selectedEmailId);
          }
          break;

        case "e": // Archive
          e.preventDefault();
          if (selectedEmailId && onArchive) {
            onArchive(selectedEmailId);
          }
          break;

        case "s": // Star/Unstar
          e.preventDefault();
          if (selectedEmailId && onToggleStar) {
            onToggleStar(selectedEmailId);
          }
          break;

        case "x": // Select/deselect current email
          e.preventDefault();
          if (selectedEmailId && onEmailToggle) {
            const isSelected = selectedEmails.has(selectedEmailId);
            onEmailToggle(selectedEmailId, !isSelected);
          }
          break;

        case "escape": // Clear selection
          e.preventDefault();
          // Could add onClearSelection callback if needed
          break;
      }
    },
    [
      emails,
      selectedEmailId,
      selectedIndex,
      onEmailSelect,
      onReply,
      onForward,
      onDelete,
      onArchive,
      onToggleStar,
      onEmailToggle,
      selectedEmails,
    ]
  );

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return dateObj.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (emails.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center bg-white border-r border-gray-200"
        role="region"
        aria-label="Email list"
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2" role="img" aria-label="Empty mailbox">
            📭
          </div>
          <p className="text-sm">No emails found</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="h-full bg-white overflow-y-auto"
      role="listbox"
      aria-label="Email list"
      aria-activedescendant={
        selectedEmailId ? `email-${selectedEmailId}` : undefined
      }
      tabIndex={0}
    >
      <div role="group" aria-label={`${emails.length} emails`}>
        {emails.map((email) => (
          <div
            key={email.id}
            id={`email-${email.id}`}
            ref={(el) => {
              if (el) itemRefs.current.set(email.id, el);
              else itemRefs.current.delete(email.id);
            }}
            role="option"
            aria-selected={selectedEmailId === email.id}
            aria-label={`${!email.read ? "Unread: " : ""}${email.from.name}, ${
              email.subject
            }, ${formatDate(email.date)}`}
            tabIndex={selectedEmailId === email.id ? 0 : -1}
            onClick={() => onEmailSelect(email.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEmailSelect(email.id);
              }
            }}
            className={`
              w-full text-left px-4 py-2 hover:shadow-sm transition-all border-b border-gray-100 group cursor-pointer
              ${
                selectedEmailId === email.id
                  ? "bg-blue-50 border-l-4 border-l-blue-600"
                  : "border-l-4 border-l-transparent"
              }
              ${!email.read ? "bg-gray-50" : "bg-white"}
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
            `}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox - Gmail style: show on hover or when any email is selected */}
              <div
                className={`transition-opacity ${
                  selectedEmails.size > 0 || selectedEmails.has(email.id)
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEmails.has(email.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onEmailToggle?.(email.id, e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle star toggle
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {email.starred ? (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ) : (
                  <Star className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Sender */}
              <div
                className={`w-40 flex-shrink-0 truncate text-sm text-gray-900 ${
                  !email.read ? "font-bold" : "font-normal"
                }`}
              >
                {email.from.name}
              </div>

              {/* Subject & Preview */}
              <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
                <span
                  className={`text-sm text-gray-900 truncate ${
                    !email.read ? "font-bold" : "font-normal"
                  }`}
                >
                  {email.subject || "(No subject)"}
                </span>
                <span className="text-sm text-gray-600 truncate flex-shrink">
                  — {email.preview}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {email.attachments && email.attachments.length > 0 && (
                  <Paperclip className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs text-gray-500 w-16 text-right">
                  {formatDate(email.date)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Load More Button */}
        {onLoadMore && emails.length > 0 && (
          <div className="py-4 text-center border-t border-gray-100">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
