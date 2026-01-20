import { Archive, Trash2, Star, ChevronLeft, Reply, Forward, MoreHorizontal, Sparkles, ExternalLink } from "lucide-react";
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
  onToggleAi?: () => void;
  isAiOpen?: boolean;
}

// Helper function to generate Gmail URL
const getGmailUrl = (emailId: string) => {
  return `https://mail.google.com/mail/u/0/#inbox/${emailId}`;
};

export const EmailDetailHeader: React.FC<EmailDetailHeaderProps> = ({
  email,
  isActionLoading,
  onClose,
  onArchive,
  onDelete,
  onStar,
  onReply,
  onForward,
  onToggleAi,
  isAiOpen,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[56px] transition-colors">
      {/* Left Side - Back Button (Mobile) & Actions */}
      <div className="flex items-center gap-1">
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-600 dark:text-slate-400 mr-1"
            aria-label="Back to list"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Action Buttons Group */}
        <div className="flex items-center gap-0.5">
          {/* Reply & Forward */}
          {onReply && (
            <button
              onClick={() => onReply(email)}
              disabled={isActionLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Reply (Ctrl + R)"
            >
              <Reply className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
          )}

          {onForward && (
            <button
              onClick={() => onForward(email)}
              disabled={isActionLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Forward (Ctrl + F)"
            >
              <Forward className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
          )}

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Star */}
          <button
            onClick={onStar}
            disabled={isActionLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={email.starred ? "Remove star" : "Add star"}
          >
            <Star
              className={`w-5 h-5 ${email.starred ? "fill-amber-400 text-amber-400" : "text-gray-600 dark:text-slate-400"
                }`}
            />
          </button>

          {/* Archive */}
          <button
            onClick={onArchive}
            disabled={isActionLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Archive"
          >
            <Archive className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            disabled={isActionLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Open in Gmail */}
          <a
            href={getGmailUrl(email.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Open in Gmail"
          >
            <ExternalLink className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </a>

          {/* More Options */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Right Side - AI Toggle */}
      {onToggleAi && (
        <div className="flex items-center">
          <button
            onClick={onToggleAi}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${isAiOpen
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md hover:shadow-lg"
              : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}
            title="AI Summary (Powered by Gemini)"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isAiOpen ? "Hide AI" : "AI Summary"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
