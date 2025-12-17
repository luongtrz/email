import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, Paperclip } from "lucide-react";
import type { Email } from "../../types/email.types";

interface KanbanCardProps {
  email: Email;
  onClick: (email: Email) => void;
  onStar?: (emailId: string) => void;
  isSelected?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  email,
  onClick,
  onStar,
  isSelected = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: email.id,
    data: {
      type: "email",
      email,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const emailDate = new Date(date);
    const diffInHours =
      (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return emailDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // Less than a week
      return emailDate.toLocaleDateString([], {
        weekday: "short",
      });
    } else {
      return emailDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatSnoozeUntil = (snoozeUntil: string) => {
    const snoozeDate = new Date(snoozeUntil);
    const now = new Date();
    const diffInHours = (snoozeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 0) {
      return "Ready to restore";
    } else if (diffInHours < 1) {
      const diffInMinutes = Math.round(diffInHours * 60);
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return snoozeDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return snoozeDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Check if email is snoozed
  const snoozeUntil = email.snoozeUntil;
  const isSnoozed = !!snoozeUntil;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isDragging ? "opacity-50 rotate-2" : ""
      } ${isSelected ? "ring-2 ring-blue-500" : ""} ${
        !email.read ? "border-l-4 border-l-blue-500" : ""
      }`}
      onClick={() => onClick(email)}
    >
      {/* Header with sender and date */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
            {email.from.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {email.from.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{email.from.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-500">
            {formatDate(email.date)}
          </span>
          {onStar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStar(email.id);
              }}
              className={`p-1 rounded hover:bg-gray-100 ${
                email.starred ? "text-yellow-500" : "text-gray-400"
              }`}
            >
              <Star size={14} fill={email.starred ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      {/* Subject */}
      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
        {email.subject}
      </h3>

      {/* Snooze Until Badge - Only show if snoozed */}
      {isSnoozed && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md w-fit">
          <svg 
            className="w-3 h-3 text-purple-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className="text-xs font-medium text-purple-700">
            Until {formatSnoozeUntil(snoozeUntil)}
          </span>
        </div>
      )}

      {/* Preview - only show if meaningful */}
      {email.preview && email.preview.trim().length > 0 && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{email.preview}</p>
      )}

      {/* Footer with attachments and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {email.attachments && email.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Paperclip size={12} />
              <span>{email.attachments.length}</span>
            </div>
          )}
          {email.labelIds && email.labelIds.length > 0 && (
            <div className="flex gap-1">
              {email.labelIds.slice(0, 2).map((labelId: string) => (
                <span
                  key={labelId}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {labelId}
                </span>
              ))}
              {email.labelIds.length > 2 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  +{email.labelIds.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Priority indicator */}
        {!email.read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </div>
    </div>
  );
};
