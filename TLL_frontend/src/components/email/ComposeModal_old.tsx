import React, { useState } from 'react';
import { emailService } from '../../services/email.service';

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
  forwardEmail 
}) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : 
    forwardEmail ? `Fwd: ${forwardEmail.subject}` : ''
  );
  const [body, setBody] = useState(
    replyTo ? `\n\n---\nOn ${new Date().toLocaleDateString()}, ${replyTo.from.name} wrote:\n${replyTo.body}` :
    forwardEmail ? `\n\n---\nForwarded message:\n${forwardEmail.body}` : ''
  );
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to.trim()) {
      alert('Please enter recipient email');
      return;
    }

    setIsSending(true);
    try {
      const toEmails = to.split(',').map(e => e.trim()).filter(Boolean);
      const ccEmails = cc.split(',').map(e => e.trim()).filter(Boolean);

      await emailService.sendEmail({
        to: toEmails,
        subject,
        body,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
      });

      alert('Email sent successfully!');
      onSent?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to send email:', error);
      alert(error.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {replyTo ? 'Reply' : forwardEmail ? 'Forward' : 'New Message'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* To Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com (comma-separated for multiple)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* CC Field (Toggle) */}
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Cc
              </button>
            )}

            {showCc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cc</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Body Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Send
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
