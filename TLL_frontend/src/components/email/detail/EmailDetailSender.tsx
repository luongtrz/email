import React, { useState } from "react";
import { formatEmailDate } from "../../../utils/email.utils";
import { ChevronDown } from "lucide-react";
import type { Email } from "../../../types/email.types";
import { useAuthStore } from "../../../store/auth.store";

interface EmailDetailSenderProps {
  email: Email;
}

// Generate consistent color from sender name/email
const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
    "bg-rose-500", "bg-orange-500", "bg-emerald-500",
    "bg-cyan-500", "bg-blue-500"
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const EmailDetailSender: React.FC<EmailDetailSenderProps> = ({ email }) => {
  const [showMore, setShowMore] = useState(false);
  const { user } = useAuthStore();

  const avatarColor = getAvatarColor(email.from?.name || email.from?.email || 'Unknown');
  const initial = (email.from?.name?.charAt(0) || email.from?.email?.charAt(0) || '?').toUpperCase();

  const isSentByMe = user?.email && email.from?.email === user.email;
  // Get primary recipient for display
  const primaryRecipient = Array.isArray(email.to) ? email.to[0] : (email.to || 'Unknown');
  const recipientDisplay = isSentByMe ? `to ${primaryRecipient}` : 'to me';

  const formatFullDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mb-6">
      {/* Sender Info - Clean Layout */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm`}>
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">{email.from?.name || email.from?.email || 'Unknown'}</span>
              </div>
              <button
                onClick={() => setShowMore(!showMore)}
                className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 flex items-center gap-1 mt-0.5"
              >
                <span>{recipientDisplay}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
              {formatEmailDate(email.date.toString())}
            </div>
          </div>

          {/* Extended Info - Expandable */}
          {showMore && (
            <div className="mt-3 text-sm text-gray-600 dark:text-slate-300 space-y-1.5 bg-gray-50/80 dark:bg-slate-800/80 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
              <div>
                <span className="font-medium text-gray-700 dark:text-slate-200">From:</span>{" "}
                {email.from?.name || 'Unknown'} &lt;{email.from?.email || ''}&gt;
              </div>
              {email.to && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-slate-200">To:</span>{" "}
                  {Array.isArray(email.to) ? email.to.join(", ") : email.to}
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700 dark:text-slate-200">Date:</span> {formatFullDate(email.date)}
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-slate-200">Subject:</span> {email.subject}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
