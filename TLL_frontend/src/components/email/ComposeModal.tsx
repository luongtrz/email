import React, { useState } from "react";
import { X, Send, Loader2, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { emailService } from "../../services/email.service";

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
  const [to, setTo] = useState(replyTo ? replyTo.from.email : "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    replyTo
      ? `Re: ${replyTo.subject}`
      : forwardEmail
      ? `Fwd: ${forwardEmail.subject}`
      : ""
  );
  const [body, setBody] = useState(
    replyTo
      ? `\n\n---\nOn ${new Date().toLocaleDateString()}, ${
          replyTo.from.name
        } wrote:\n${replyTo.body}`
      : forwardEmail
      ? `\n\n---\nForwarded message:\n${forwardEmail.body}`
      : ""
  );
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!to.trim()) {
      toast.error("Please enter at least one recipient");
      return;
    }

    setIsSending(true);
    try {
      const toEmails = to
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const ccEmails = cc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const bccEmails = bcc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      await emailService.sendEmail({
        to: toEmails,
        subject: subject || "(No subject)",
        body,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
      });

      toast.success("Email sent successfully!");
      onSent?.();
      onClose();
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to send email. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {replyTo
                  ? "Reply to Email"
                  : forwardEmail
                  ? "Forward Email"
                  : "New Message"}
              </h2>
              {replyTo && (
                <p className="text-xs text-blue-100">to {replyTo.from.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col max-h-[calc(90vh-80px)]"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* To Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  To <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Bcc
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple emails with commas
              </p>
            </div>

            {/* Cc Field */}
            {showCc && (
              <div className="animate-slideUp">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Cc
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCc(false);
                      setCc("");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            )}

            {/* Bcc Field */}
            {showBcc && (
              <div className="animate-slideUp">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Bcc
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBcc(false);
                      setBcc("");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            )}

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Body Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
              />
            </div>

            {/* Forward Info */}
            {forwardEmail?.attachments &&
              forwardEmail.attachments.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg animate-slideUp">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    📎 {forwardEmail.attachments.length} attachment
                    {forwardEmail.attachments.length > 1 ? "s" : ""} will be
                    forwarded
                  </p>
                  <div className="space-y-1">
                    {forwardEmail.attachments.map((att, idx) => (
                      <p key={idx} className="text-xs text-blue-700">
                        • {att.filename} ({att.size})
                      </p>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
