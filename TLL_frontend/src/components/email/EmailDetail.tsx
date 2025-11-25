import React, { useEffect } from 'react';
import type { Email } from '../../types/email.types';

interface EmailDetailProps {
  email: Email | null;
  onClose?: () => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onClose }) => {
  useEffect(() => {
    if (email && !email.read) {
      // Mark as read when opened
      // In real app, call API here
      console.log(`Marking email ${email.id} as read`);
    }
  }, [email]);

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📧</div>
          <p className="text-lg font-medium">Select an email to read</p>
          <p className="text-sm mt-2">Choose an email from the list to view its contents</p>
        </div>
      </div>
    );
  }

  const formatFullDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex-1 pr-4">
            {email.subject}
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-500 hover:text-gray-700 p-1"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {email.from.name.charAt(0)}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{email.from.name}</span>
              {email.starred && <span className="text-yellow-500">⭐</span>}
            </div>
            <div className="text-sm text-gray-600">
              <span className="text-gray-500">from:</span> {email.from.email}
            </div>
            <div className="text-sm text-gray-600">
              <span className="text-gray-500">to:</span> {email.to.join(', ')}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatFullDate(email.date)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Reply
          </button>
          <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition">
            Forward
          </button>
          <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition">
            Archive
          </button>
          <button className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition">
            Delete
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          className="prose max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Attachments ({email.attachments.length})
            </h3>
            <div className="space-y-2">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex-shrink-0 text-2xl">
                    {attachment.type.includes('pdf') ? '📄' : '🖼️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500">{attachment.size}</p>
                  </div>
                  <button className="flex-shrink-0 text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
