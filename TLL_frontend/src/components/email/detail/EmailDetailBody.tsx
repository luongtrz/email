import React from "react";

interface EmailDetailBodyProps {
  body: string;
}

export const EmailDetailBody: React.FC<EmailDetailBodyProps> = ({ body }) => {
  // Trust Gmail's HTML completely - render as-is (includes styles, structure, everything)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Render complete HTML with iframe for isolation */}
      <iframe
        title="Email Content"
        srcDoc={body}
        className="w-full border-0"
        style={{
          minHeight: '400px',
          height: 'auto',
        }}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        onLoad={(e) => {
          // Auto-resize iframe to content height
          const iframe = e.target as HTMLIFrameElement;
          if (iframe.contentWindow) {
            const height = iframe.contentWindow.document.body.scrollHeight;
            iframe.style.height = `${height + 20}px`;
          }
        }}
      />
      
      <style>{`
        .email-body-content {
          /* Reset some defaults */
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        /* Ensure tables are responsive */
        .email-body-content table {
          max-width: 100%;
          border-collapse: collapse;
        }
        
        /* Ensure images don't overflow */
        .email-body-content img {
          max-width: 100%;
          height: auto;
        }
        
        /* Links styling */
        .email-body-content a {
          color: #1a73e8;
          text-decoration: none;
        }
        
        .email-body-content a:hover {
          text-decoration: underline;
        }
        
        /* Buttons */
        .email-body-content a[style*="background-color"] {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 4px;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};
