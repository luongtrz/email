import React from "react";
import { Archive, Trash2, Star, ChevronLeft, Reply, Forward } from "lucide-react";
import type { Email } from "../../../types/email.types";

interface EmailDetailHeaderProps {
  email: Email;
  isActionLoading: boolean;
  onClose?: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStar: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

export const EmailDetailHeader: React.FC<EmailDetailHeaderProps> = ({
  email,
  isActionLoading,
  onClose,
  onArchive,
  onDelete,
  onStar,
  onReply,
  onForward,
}) => {
  return (
    <>
      {/* Mobile Back Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to list"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onArchive}
          disabled={isActionLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Archive"
        >
          <Archive className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onDelete}
          disabled={isActionLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Delete"
        >
          <Trash2 className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onStar}
          disabled={isActionLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title={email.starred ? "Remove star (Ctrl + S)" : "Add star (Ctrl + S)"}
        >
          <Star
            className={`w-5 h-5 ${
              email.starred
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-600"
            }`}
          />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {onReply && (
          <button
            onClick={() => onReply(email)}
            disabled={isActionLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Reply (Ctrl + R)"
          >
            <Reply className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {onForward && (
          <button
            onClick={() => onForward(email)}
            disabled={isActionLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Forward (Ctrl + F)"
          >
            <Forward className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>
    </>
  );
};
