import { useState } from "react";
import toast from "react-hot-toast";
import { emailService } from "../services/email.service";
import { logger } from "../lib/logger";

interface UseComposeFormProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onSuccess?: () => void;
  onClose: () => void;
}

export const useComposeForm = ({
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  onSuccess,
  onClose,
}: UseComposeFormProps) => {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!to.trim()) {
      toast.error("Vui lòng nhập ít nhất một người nhận");
      return;
    }

    setIsSending(true);
    try {
      const toEmails = to.split(",").map((e) => e.trim()).filter(Boolean);
      const ccEmails = cc.split(",").map((e) => e.trim()).filter(Boolean);
      const bccEmails = bcc.split(",").map((e) => e.trim()).filter(Boolean);

      const payload = {
        to: toEmails,
        subject: subject || "(no subject)",
        body,
        ...(ccEmails.length > 0 && { cc: ccEmails }),
        ...(bccEmails.length > 0 && { bcc: bccEmails }),
      };

      await emailService.sendEmail(payload);
      toast.success("Đã gửi email thành công!");
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error("Failed to send email", error);
      toast.error("Không thể gửi email");
    } finally {
      setIsSending(false);
    }
  };

  return {
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
  };
};
