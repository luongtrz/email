// Example usage in a component
import React from "react";
import { EmailDetailModal } from "./EmailDetailModal";
import { useEmailNavigation } from "../../hooks/useEmailNavigation";
import type { Email } from "../../types/email.types";

interface ExampleEmailListProps {
  emails: Email[];
}

export const ExampleEmailList: React.FC<ExampleEmailListProps> = ({
  emails,
}) => {
  const {
    selectedEmail,
    selectedIndex,
    isOpen,
    canGoPrevious,
    canGoNext,
    openEmail,
    closeModal,
    goToNext,
    goToPrevious,
  } = useEmailNavigation({ emails });

  const handleEmailClick = (email: Email) => {
    openEmail(email);
  };

  const handleEmailUpdated = () => {
    // Refetch emails or invalidate queries
    console.log("Email updated, refetch data...");
  };

  const handleReply = (email: Email) => {
    console.log("Reply to:", email);
    // Open compose modal with reply mode
  };

  const handleForward = (email: Email) => {
    console.log("Forward:", email);
    // Open compose modal with forward mode
  };

  return (
    <div className="p-4">
      {/* Email List */}
      <div className="space-y-2">
        {emails.map((email, index) => (
          <div
            key={email.id}
            onClick={() => handleEmailClick(email)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
              selectedIndex === index ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{email.from.name}</h3>
              <span className="text-xs text-gray-500">
                {new Date(email.date).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">
              {email.subject}
            </p>
            <p className="text-sm text-gray-600 truncate">{email.preview}</p>
          </div>
        ))}
      </div>

      {/* Email Detail Modal */}
      <EmailDetailModal
        email={selectedEmail}
        isOpen={isOpen}
        onClose={closeModal}
        onEmailUpdated={handleEmailUpdated}
        onReply={handleReply}
        onForward={handleForward}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={goToPrevious}
        onNext={goToNext}
        currentIndex={selectedIndex}
        totalEmails={emails.length}
      />
    </div>
  );
};
