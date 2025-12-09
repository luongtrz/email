import React from "react";
import { X, Send, Loader2, Minus, Maximize2 } from "lucide-react";
import { useComposeForm } from "../../hooks/useComposeForm";

interface ComposeModalProps {
  onClose: () => void;
  onSent?: () => void;
  replyTo?: {
    id: string;
    subject: string;
    from: { name: string; email: string };
    body: string;
  };
  forwardEmail?: {
    id: string;
    subject: string;
    body: string;
    attachments?: any[];
  };
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  onClose,
  onSent,
  replyTo,
  forwardEmail,
}) => {
  const initialTo = replyTo ? replyTo.from.email : "";
  const initialSubject = replyTo
    ? `Re: ${replyTo.subject}`
    : forwardEmail
    ? `Fwd: ${forwardEmail.subject}`
    : "";
  const initialBody = replyTo
    ? `\n\n---\nOn ${new Date().toLocaleDateString()}, ${replyTo.from.name} wrote:\n${replyTo.body}`
    : forwardEmail
    ? `\n\n\nForwarded message:\n${forwardEmail.body}`
    : "";

  const {
    to,
    setTo,
    cc,
    setCc,
    bcc,
    setBcc,
    subject,
    setSubject,
    body,
    setBody,
    isSending,
    showCc,
    setShowCc,
    showBcc,
    setShowBcc,
    isMinimized,
    setIsMinimized,
    handleSubmit,
  } = useComposeForm({
    initialTo,
    initialSubject,
    initialBody,
    onSuccess: onSent,
    onClose,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white rounded-lg shadow-2xl w-full transition-all duration-200 ${
          isMinimized ? "max-w-md h-16" : "max-w-3xl max-h-[90vh]"
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyTo ? "Reply" : forwardEmail ? "Forward" : "New Message"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-5 h-5 text-gray-600" />
              ) : (
                <Minus className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 w-16">To:</label>
                  <input
                    type="email"
                    multiple
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="recipient@example.com"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Cc
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBcc(!showBcc)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Bcc
                  </button>
                </div>
              </div>

              {showCc && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 w-16">Cc:</label>
                  <input
                    type="email"
                    multiple
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="cc@example.com"
                  />
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 w-16">Bcc:</label>
                  <input
                    type="email"
                    multiple
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="bcc@example.com"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 w-16">Subject:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Subject"
                />
              </div>

              <div className="flex-1">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Write your message..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
