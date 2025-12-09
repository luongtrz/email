import React, { useMemo } from "react";
import DOMPurify from "dompurify";

interface EmailDetailBodyProps {
  body: string;
}

export const EmailDetailBody: React.FC<EmailDetailBodyProps> = ({ body }) => {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedBody = useMemo(() => {
    return DOMPurify.sanitize(body, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
        'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'span', 'div', 'pre', 'code'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target'],
      ALLOW_DATA_ATTR: false,
    });
  }, [body]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div
        className="prose prose-sm max-w-none text-gray-800 [&_*]:!text-gray-800 [&_*]:!bg-transparent"
        style={{ colorScheme: "light" }}
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />
    </div>
  );
};
