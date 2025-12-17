import React from "react";
import { Star, Paperclip } from "lucide-react";
import type { Email } from "../../../types/email.types";
import { formatEmailDate } from "../../../utils/email.utils";

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggle?: (checked: boolean) => void;
  registerRef?: (element: HTMLDivElement | null) => void;
}

export const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggle,
  registerRef,
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggle?.(e.target.checked);
  };

  return (
    <div
      ref={registerRef}
      onClick={onSelect}
      className={`
        group relative flex items-center gap-3 px-4 py-2 border-b border-gray-100
        cursor-pointer transition-colors hover:bg-gray-50
        ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"}
        ${!email.read ? "bg-white" : "bg-gray-50"}
      `}
    >
      {/* Checkbox - Shows on hover or when checked */}
      {onToggle && (
        <div
          onClick={handleCheckboxClick}
          className={`flex-shrink-0 ${
            isChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } transition-opacity`}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Star toggle handled by parent via keyboard or separate button
        }}
        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
      >
        <Star
          className={`w-4 h-4 ${
            email.starred
              ? "text-yellow-500 fill-yellow-500"
              : "text-gray-400"
          }`}
        />
      </button>

      {/* Sender */}
      <div
        className={`min-w-[150px] max-w-[200px] truncate text-sm ${
          !email.read ? "font-semibold text-gray-900" : "font-normal text-gray-700"
        }`}
      >
        {email.from.name}
      </div>

      {/* Subject & Preview */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span
          className={`text-sm truncate ${
            !email.read ? "font-semibold text-gray-900" : "font-normal text-gray-700"
          }`}
        >
          {email.subject}
        </span>
        {email.preview && email.preview.trim().length > 0 && (
          <span className="text-sm text-gray-500 truncate flex-shrink">
            {` - ${email.preview}`}
          </span>
        )}
      </div>

      {/* Attachment Icon */}
      {email.attachments && email.attachments.length > 0 && (
        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}

      {/* Date */}
      <div className="text-xs text-gray-500 flex-shrink-0 min-w-[60px] text-right">
        {formatEmailDate(typeof email.date === "string" ? email.date : email.date.toISOString())}
      </div>
    </div>
  );
};
