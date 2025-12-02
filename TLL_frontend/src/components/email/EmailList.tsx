import React from 'react';
import { Star, Paperclip } from 'lucide-react';
import type { Email } from '../../types/email.types';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  selectedEmails?: Set<string>;
  onEmailToggle?: (emailId: string, checked: boolean) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onEmailSelect,
  selectedEmails = new Set(),
  onEmailToggle,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (emails.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm">No emails found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div>
        {emails.map((email) => (
          <div
            key={email.id}
            onClick={() => onEmailSelect(email.id)}
            className={`
              w-full text-left px-4 py-2 hover:shadow-sm transition-all border-b border-gray-100 group cursor-pointer
              ${selectedEmailId === email.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}
              ${!email.read ? 'bg-gray-50' : 'bg-white'}
            `}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox - Gmail style: show on hover or when any email is selected */}
              <div className={`transition-opacity ${
                selectedEmails.size > 0 || selectedEmails.has(email.id)
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={selectedEmails.has(email.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onEmailToggle?.(email.id, e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Star */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle star toggle
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {email.starred ? (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ) : (
                  <Star className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Sender */}
              <div className={`w-40 flex-shrink-0 truncate text-sm text-gray-900 ${!email.read ? 'font-bold' : 'font-normal'}`}>
                {email.from.name}
              </div>

              {/* Subject & Preview */}
              <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
                <span className={`text-sm text-gray-900 truncate ${!email.read ? 'font-bold' : 'font-normal'}`}>
                  {email.subject || '(No subject)'}
                </span>
                <span className="text-sm text-gray-600 truncate flex-shrink">
                  — {email.preview}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {email.attachments && email.attachments.length > 0 && (
                  <Paperclip className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs text-gray-500 w-16 text-right">
                  {formatDate(email.date)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Load More Button */}
        {onLoadMore && emails.length > 0 && (
          <div className="py-4 text-center border-t border-gray-100">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
