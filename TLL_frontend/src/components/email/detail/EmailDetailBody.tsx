import React from "react";

interface EmailDetailBodyProps {
  body: string;
}

export const EmailDetailBody: React.FC<EmailDetailBodyProps> = ({ body }) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  // Detect dark mode
  React.useEffect(() => {
    // Initial check
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();

    // Observe changes to html class attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const wrappedHTML = React.useMemo(() => {
    // Detect if body is already a complete HTML document
    const isCompleteHTML = /<!DOCTYPE/i.test(body) || /<html[^>]*>/i.test(body);

    const darkModeStyle = isDarkMode ? `
      html {
        filter: invert(1) hue-rotate(180deg);
      }
      /* Restore images/media/iframes/vectors to normal colors */
      img, video, iframe, canvas, svg, embed, object {
        filter: invert(1) hue-rotate(180deg);
      }
      /* Prevent double inversion if inner iframes are used */
      iframe html {
        filter: none;
      }
    ` : '';

    // If already complete HTML document, enhance it with safety measures
    if (isCompleteHTML) {
      // Inject base tag if missing (for relative URLs) and meta tags for safety
      let enhancedHTML = body;

      // Add base tag after <head> if not present (prevents relative URL issues)
      if (!/<base\s/i.test(body)) {
        enhancedHTML = enhancedHTML.replace(
          /(<head[^>]*>)/i,
          '$1\n<base href="about:blank" target="_blank">'
        );
      }

      // Ensure charset is specified
      if (!/<meta[^>]+charset/i.test(body)) {
        enhancedHTML = enhancedHTML.replace(
          /(<head[^>]*>)/i,
          '$1\n<meta charset="UTF-8">'
        );
      }

      // Inject dark mode styles if needed
      if (isDarkMode) {
        // If <style> exists, append to it, otherwise add to head
        if (enhancedHTML.includes('</head>')) {
          enhancedHTML = enhancedHTML.replace('</head>', `<style>${darkModeStyle}</style></head>`);
        } else {
          // Fallback if no head (unlikely for complete HTML but possible)
          enhancedHTML = `<style>${darkModeStyle}</style>` + enhancedHTML;
        }
      }

      return enhancedHTML;
    }

    // Otherwise, detect if plain text or HTML fragment
    const isPlainText = !/<[^>]+>/.test(body);

    // Wrap partial HTML or plain text in complete document with comprehensive protection
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <base href="about:blank" target="_blank">
  <style>
    /* Comprehensive CSS Reset - Gmail-style isolation */
    *, *::before, *::after { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    html { 
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      -moz-osx-font-smoothing: grayscale;
      -webkit-font-smoothing: antialiased;
    }
    
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 100% !important;
      min-height: 100%;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: ${isPlainText ? '16px' : '0'};
      ${isPlainText ? 'white-space: pre-wrap;' : ''}
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }
    
    /* Reset tables completely */
    table { 
      border-collapse: collapse; 
      border-spacing: 0; 
      max-width: 100%;
    }
    
    /* Responsive images - prevent overflow */
    img { 
      max-width: 100% !important; 
      height: auto !important; 
      border: 0; 
      display: block;
      -ms-interpolation-mode: bicubic;
    }
    
    /* Links inherit color by default */
    a { 
      color: inherit; 
      text-decoration: underline;
    }
    
    /* Prevent text overflow */
    p, div, span, td, th {
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    
    /* Handle long URLs */
    a[href] {
      word-break: break-all;
    }
    
    /* Prevent horizontal overflow */
    * {
      max-width: 100%;
    }
    
    /* Fix for outlook conditional comments */
    .mso { display: none; }
    
    /* Responsive container */
    body > table,
    body > div,
    body > center {
      max-width: 100% !important;
    }

    ${darkModeStyle}
  </style>
</head>
<body>
${body}
</body>
</html>`;
  }, [body, isDarkMode]);

  // Enhanced resize logic with ResizeObserver for continuous monitoring
  const setupResizeObserver = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow?.document?.body) return;

    const resizeIframe = () => {
      try {
        const iframeDoc = iframe.contentWindow!.document;
        const body = iframeDoc.body;
        const html = iframeDoc.documentElement;

        // Force reflow
        void body.offsetHeight;

        // Get maximum height from all possible sources
        const heights = [
          body.scrollHeight,
          body.offsetHeight,
          body.clientHeight,
          html.scrollHeight,
          html.offsetHeight,
          html.clientHeight,
        ];

        // Find max content in tables (common in emails)
        const tables = iframeDoc.querySelectorAll('table');
        tables.forEach(table => {
          heights.push((table as HTMLElement).scrollHeight);
        });

        const maxHeight = Math.max(...heights, 400); // Min 400px

        if (maxHeight > 0 && maxHeight < 50000) { // Max 50000px safety
          iframe.style.height = `${maxHeight + 40}px`;
        }
      } catch (err) {
        console.warn('Resize iframe error:', err);
      }
    };

    // Initial resize attempts
    const timeouts = [50, 150, 400, 800, 1500];
    timeouts.forEach(delay => setTimeout(resizeIframe, delay));

    // Setup ResizeObserver for dynamic content (e.g., lazy-loaded images)
    try {
      if ('ResizeObserver' in window) {
        resizeObserverRef.current = new ResizeObserver(resizeIframe);
        resizeObserverRef.current.observe(iframe.contentWindow!.document.body);
      }
    } catch (err) {
      console.warn('ResizeObserver setup failed:', err);
    }

    // Listen for image load events
    const images = iframe.contentWindow!.document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', resizeIframe);
        img.addEventListener('error', resizeIframe);
      }
    });

    // Cleanup
    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setupResizeObserver();
  }, [setupResizeObserver]);

  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    console.error('Email iframe failed to load');
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="text-red-600 text-lg font-medium mb-2">
          Unable to display email content
        </div>
        <div className="text-red-500 text-sm">
          The email format may be unsupported or corrupted.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Loading email...</div>
          </div>
        </div>
      )}

      {/* Gmail-style iframe with comprehensive isolation and error handling */}
      <iframe
        ref={iframeRef}
        title="Email Content"
        srcDoc={wrappedHTML}
        className="w-full border-0"
        style={{
          minHeight: '400px',
          height: '600px',
          display: 'block',
          backgroundColor: isDarkMode ? '#1e293b' : '#fff', // slate-900 : white
        }}
        // NO sandbox - trust Gmail's sanitization, allow all features
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        // Security: disable some features
        allow="autoplay 'none'; camera 'none'; microphone 'none'; geolocation 'none'"
      />
    </div>
  );
};
