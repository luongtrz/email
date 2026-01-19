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
  onToggleStar?: () => void;
  registerRef?: (element: HTMLDivElement | null) => void;
}

// More refined pastel/modern palette
const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
    "bg-rose-500", "bg-orange-500", "bg-emerald-500",
    "bg-cyan-500", "bg-blue-500"
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggle,
  onToggleStar,
  registerRef,
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggle?.(e.target.checked);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.();
  };

  const avatarColor = getAvatarColor(email.from.name || email.from.email);
  const senderName = email.from.name || email.from.email;
  const initial = senderName.charAt(0).toUpperCase();
  const formattedDate = formatEmailDate(
    typeof email.date === "string" ? email.date : email.date.toISOString()
  );

  return (
    <div
      ref={registerRef}
      onClick={onSelect}
      className={`
        group relative flex items-center gap-3 px-3 py-3
        cursor-pointer transition-all duration-200 border-b border-gray-100/80 last:border-b-0
        hover:shadow-sm hover:z-10
        ${isSelected
          ? "bg-indigo-50/50"
          : "bg-white hover:bg-white"
        }
        ${isChecked ? "bg-indigo-50/50" : ""}
      `}
    >
      {/* Visual Indicator Bar (Left) */}
      <div className={`
        absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-indigo-500 
        transition-all duration-300 ease-out
        ${isSelected || isChecked ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'}
      `} />

      {/* Checkbox - Reveal on hover or checked */}
      {onToggle && (
        <div
          onClick={handleCheckboxClick}
          className={`
            flex-shrink-0 transition-all duration-300 ease-out
            ${isChecked || isSelected
              ? "opacity-100 w-5 translate-x-0"
              : "opacity-0 w-0 -translate-x-2 overflow-hidden group-hover:opacity-100 group-hover:w-5 group-hover:translate-x-0"
            }
          `}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-indigo-600 rounded-md border-gray-300 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-transform duration-200 active:scale-95"
          />
        </div>
      )}

      {/* Star - Compact Position */}
      <button
        onClick={handleStarClick}
        className={`flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-all duration-200 ${email.starred ? "text-amber-400 opacity-100" : "text-gray-300 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
          }`}
      >
        <Star className={`w-4 h-4 ${email.starred ? "fill-current" : ""}`} />
      </button>

      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white
        ${avatarColor} ${!email.read ? "ring-indigo-100 ring-offset-1" : "opacity-80 grayscale-[0.2]"}
        transition-all duration-300 group-hover:scale-105 group-hover:shadow-md
      `}>
        {initial}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">

        {/* Top Line: Sender & Date */}
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate mr-2 ${!email.read ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
            {senderName}
          </span>
          <span className={`text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${!email.read ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"}`}>
            {formattedDate}
          </span>
        </div>

        {/* Bottom Line: Subject & Preview */}
        <div className="flex items-center text-sm leading-relaxed">
          <span className={`truncate flex-shrink-0 max-w-[45%] ${!email.read ? "font-semibold text-gray-800" : "font-medium text-gray-600"}`}>
            {email.subject || "(No Subject)"}
          </span>

          <span className="mx-2 text-gray-300 flex-shrink-0">&ndash;</span>

          <span className="truncate text-gray-500 min-w-0 pr-2 font-normal">
            {email.preview || "No preview available"}
          </span>

          {/* Attachment Icon */}
          {email.attachments && email.attachments.length > 0 && (
            <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-auto" />
          )}
        </div>
      </div>
    </div>
  );
};
