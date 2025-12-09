import React, { useState } from "react";
import { formatEmailDate } from "../../../utils/email.utils";
import type { Email } from "../../../types/email.types";

interface EmailDetailSenderProps {
  email: Email;
}

export const EmailDetailSender: React.FC<EmailDetailSenderProps> = ({ email }) => {
  const [showMore, setShowMore] = useState(false);

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
    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
      {/* Sender Info */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
          {email.from.name?.charAt(0).toUpperCase() ||
            email.from.email.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{email.from.name}</span>
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showMore ? "Hide details" : "Show details"}
                </button>
              </div>
              <div className="text-sm text-gray-600">
                <span>to me</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 whitespace-nowrap">
              {formatEmailDate(email.date.toString())}
            </div>
          </div>

          {/* Extended Info */}
          {showMore && (
            <div className="mt-4 text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
              <div>
                <span className="font-medium">From:</span> {email.from.name}{" "}
                &lt;{email.from.email}&gt;
              </div>
              {email.to && email.to.length > 0 && (
                <div>
                  <span className="font-medium">To:</span>{" "}
                  {Array.isArray(email.to) ? email.to.join(", ") : email.to}
                </div>
              )}
              <div>
                <span className="font-medium">Date:</span> {formatFullDate(email.date)}
              </div>
              <div>
                <span className="font-medium">Subject:</span> {email.subject}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
