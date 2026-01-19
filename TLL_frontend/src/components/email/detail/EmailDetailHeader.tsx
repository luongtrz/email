import { Archive, Trash2, Star, ChevronLeft, Reply, Forward, MoreHorizontal, Sparkles } from "lucide-react";
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
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white min-h-[56px]">
      {/* Left Side - Back Button (Mobile) & Actions */}
      <div className="flex items-center gap-1">
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 mr-1"
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
              <Reply className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {onForward && (
            <button
              onClick={() => onForward(email)}
              disabled={isActionLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Forward (Ctrl + F)"
            >
              <Forward className="w-5 h-5 text-gray-600" />
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
              className={`w-5 h-5 ${email.starred ? "fill-amber-400 text-amber-400" : "text-gray-600"
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
            <Archive className="w-5 h-5 text-gray-600" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            disabled={isActionLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-gray-600" />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* More Options */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
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
              : "hover:bg-gray-100 text-gray-700 hover:text-purple-600 border border-gray-200 bg-white"
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
