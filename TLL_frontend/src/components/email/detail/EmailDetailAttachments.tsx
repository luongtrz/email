import React from "react";
import { Paperclip, Download } from "lucide-react";
import { formatFileSize } from "../../../utils/email.utils";
import type { Email } from "../../../types/email.types";

interface EmailDetailAttachmentsProps {
  attachments: Email["attachments"];
  onDownload: (attachmentId: string, filename: string) => void;
  isLoading: boolean;
}

export const EmailDetailAttachments: React.FC<EmailDetailAttachmentsProps> = ({
  attachments,
  onDownload,
  isLoading,
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-700">
        <Paperclip className="w-4 h-4" />
        <span>
          {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, idx) => (
          <button
            key={idx}
            onClick={() => onDownload(attachment.id || "", attachment.filename)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900 dark:text-slate-200 truncate max-w-[200px]">
              {attachment.filename}
            </span>
            <span className="text-gray-500 text-xs">
              {typeof attachment.size === 'number' ? formatFileSize(attachment.size) : attachment.size}
            </span>
            <Download className="w-3 h-3 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};
