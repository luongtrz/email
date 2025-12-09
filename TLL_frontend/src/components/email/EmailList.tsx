import React, { useRef, useEffect, useCallback } from "react";
import { useEmailKeyboard } from "../../hooks/useEmailKeyboard";
import { EmailListItem } from "./list/EmailListItem";
import { EmailListEmpty } from "./list/EmailListEmpty";
import { EmailListLoader } from "./list/EmailListLoader";
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

  const { registerItem } = useEmailKeyboard({
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
  });

  // Auto load more when scrolling near bottom
  const handleScroll = useCallback(() => {
    if (!listRef.current || !onLoadMore || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger load more when scrolled 90% down
    if (scrollPercentage > 0.9) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore]);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    listElement.addEventListener('scroll', handleScroll);
    return () => listElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (emails.length === 0) {
    return <EmailListEmpty />;
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto bg-white">
      {/* Email List */}
      <div className="divide-y divide-gray-100">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            isChecked={selectedEmails.has(email.id)}
            onSelect={() => onEmailSelect(email.id)}
            onToggle={
              onEmailToggle
                ? (checked) => onEmailToggle(email.id, checked)
                : undefined
            }
            registerRef={(el) => registerItem(email.id, el)}
          />
        ))}
      </div>

      {/* Loading Indicator at Bottom */}
      {isLoadingMore && (
        <div className="p-4">
          <EmailListLoader />
        </div>
      )}
    </div>
  );
};
