import { Injectable } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';

@Injectable()
export class GmailParserService {
  /**
   * Parse Gmail message to application format
   */
  parseMessage(message: gmail_v1.Schema$Message): any {
    const headers = this.parseHeaders(message.payload?.headers || []);
    const body = this.parseBody(message.payload);
    const attachments = this.parseAttachments(message.payload);

    return {
      id: message.id,
      threadId: message.threadId,
      from: {
        name: this.parseEmailAddress(headers.from || '').name,
        email: this.parseEmailAddress(headers.from || '').email,
      },
      to: this.parseEmailAddressList(headers.to || ''),
      cc: headers.cc ? this.parseEmailAddressList(headers.cc) : [],
      bcc: headers.bcc ? this.parseEmailAddressList(headers.bcc) : [],
      subject: headers.subject || '',
      preview: this.extractPreview(body.text || body.html || ''),
      body: body.html || body.text || '',
      date: new Date(parseInt(message.internalDate || '0')),
      read: !message.labelIds?.includes('UNREAD'),
      starred: message.labelIds?.includes('STARRED') || false,
      folder: this.determineFolder(message.labelIds || []),
      labelIds: message.labelIds || [], // Include Gmail labels for frontend filtering
      attachments: attachments.length > 0 ? attachments : undefined,
      snippet: message.snippet || '',
    };
  }

  /**
   * Decode RFC 2047 encoded-words in email headers
   * Example: =?UTF-8?B?TGnhu4FuZyBCw6Nu?= -> Liêng Bún
   */
  private decodeHeader(value: string): string {
    if (!value) return value;

    // Match RFC 2047 encoded-words: =?charset?encoding?encoded-text?=
    const encodedWordRegex = /=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g;
    
    return value.replace(encodedWordRegex, (match, charset, encoding, encodedText) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          // Base64 encoding
          const decoded = Buffer.from(encodedText, 'base64').toString('utf-8');
          return decoded;
        } else if (encoding.toUpperCase() === 'Q') {
          // Quoted-printable encoding
          const decoded = encodedText
            .replace(/_/g, ' ')
            .replace(/=([0-9A-F]{2})/gi, (_, hex) => 
              String.fromCharCode(parseInt(hex, 16))
            );
          return decoded;
        }
      } catch (error) {
        console.warn('Failed to decode header:', match, error);
        return match; // Return original if decode fails
      }
      return match;
    });
  }

  /**
   * Encode header value to RFC 2047 if contains non-ASCII characters
   * Example: Liêng Bún -> =?UTF-8?B?TGnhu4FuZyBCw6Bu?=
   */
  private encodeHeader(value: string): string {
    if (!value) return value;

    // Check if string contains non-ASCII characters
    if (!/[^\x00-\x7F]/.test(value)) {
      return value; // Pure ASCII, no encoding needed
    }

    // Encode as Base64
    const encoded = Buffer.from(value, 'utf-8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  /**
   * Parse email headers
   */
  private parseHeaders(
    headers: gmail_v1.Schema$MessagePartHeader[],
  ): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((header) => {
      if (header.name && header.value) {
        // Decode RFC 2047 encoded headers
        const decodedValue = this.decodeHeader(header.value);
        result[header.name.toLowerCase()] = decodedValue;
      }
    });
    return result;
  }

  /**
   * Parse email body (HTML and plain text)
   */
  private parseBody(payload: gmail_v1.Schema$MessagePart | undefined): {
    html: string;
    text: string;
  } {
    let html = '';
    let text = '';

    if (!payload) {
      return { html, text };
    }

    // Check if this is a multipart message
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          text = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }

        // Recursively check nested parts
        if (part.parts) {
          const nested = this.parseBody(part);
          if (nested.html) html = nested.html;
          if (nested.text) text = nested.text;
        }
      }
    } else if (payload.body?.data) {
      // Single part message
      if (payload.mimeType === 'text/html') {
        html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload.mimeType === 'text/plain') {
        text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
    }

    return { html, text };
  }

  /**
   * Parse attachments (public method for use in service)
   */
  parseAttachments(payload: gmail_v1.Schema$MessagePart | undefined): Array<{
    id: string;
    name: string;
    size: string;
    type: string;
  }> {
    const attachments: Array<{
      id: string;
      name: string;
      size: string;
      type: string;
    }> = [];

    if (!payload) {
      return attachments;
    }

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        const size = part.body.size || 0;
        attachments.push({
          id: part.body.attachmentId,
          name: part.filename,
          size: this.formatFileSize(size),
          type: part.mimeType || 'application/octet-stream',
        });
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    if (payload.parts) {
      payload.parts.forEach(processPart);
    } else {
      processPart(payload);
    }

    return attachments;
  }

  /**
   * Parse email address string to name and email
   */
  private parseEmailAddress(address: string): { name: string; email: string } {
    const match = address.match(/^(.+?)\s*<(.+?)>$|^(.+?)$/);
    if (match) {
      if (match[2]) {
        return {
          name: match[1].trim().replace(/^["']|["']$/g, ''),
          email: match[2].trim(),
        };
      }
      return {
        name: '',
        email: match[3]?.trim() || address.trim(),
      };
    }
    return { name: '', email: address.trim() };
  }

  /**
   * Parse comma-separated email address list
   */
  private parseEmailAddressList(addresses: string): string[] {
    return addresses
      .split(',')
      .map((addr) => this.parseEmailAddress(addr.trim()).email)
      .filter((email) => email);
  }

  /**
   * Extract preview text from body
   */
  private extractPreview(body: string, maxLength: number = 150): string {
    // Remove HTML tags
    const text = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Determine folder from Gmail labels
   */
  private determineFolder(labelIds: string[]): string {
    if (labelIds.includes('INBOX')) return 'inbox';
    if (labelIds.includes('SENT')) return 'sent';
    if (labelIds.includes('DRAFT')) return 'drafts';
    if (labelIds.includes('TRASH')) return 'trash';
    if (labelIds.includes('SPAM')) return 'spam';
    if (labelIds.includes('IMPORTANT')) return 'important';
    if (labelIds.includes('STARRED')) return 'starred';
    return 'inbox'; // Default
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Create raw message for sending
   */
  createRawMessage(options: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
    references?: string;
    inReplyTo?: string;
  }): string {
    const {
      to,
      subject,
      body,
      cc,
      bcc,
      replyTo,
      attachments,
      references,
      inReplyTo,
    } = options;

    const lines: string[] = [];
    lines.push(`To: ${to.join(', ')}`);
    if (cc && cc.length > 0) {
      lines.push(`Cc: ${cc.join(', ')}`);
    }
    if (bcc && bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(', ')}`);
    }
    lines.push(`Subject: ${this.encodeHeader(subject)}`);
    lines.push(`Date: ${new Date().toUTCString()}`);
    if (replyTo) {
      lines.push(`Reply-To: ${replyTo}`);
    }
    if (inReplyTo) {
      lines.push(`In-Reply-To: <${inReplyTo}>`);
    }
    if (references) {
      lines.push(`References: <${references}>`);
    }

    // Determine if body is HTML
    const isHtml =
      body.includes('<html') || body.includes('<div') || body.includes('<p>');
    const contentType = isHtml ? 'text/html' : 'text/plain';

    if (attachments && attachments.length > 0) {
      // Multipart message with attachments
      const boundary = `----=_Part_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${contentType}; charset=UTF-8`);
      lines.push('Content-Transfer-Encoding: 7bit');
      lines.push('');
      lines.push(body);

      // Add attachments
      for (const attachment of attachments) {
        lines.push(`--${boundary}`);
        lines.push(
          `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
        );
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
        );
        lines.push('');
        lines.push(attachment.content.toString('base64'));
      }

      lines.push(`--${boundary}--`);
    } else {
      // Simple message without attachments
      lines.push(`Content-Type: ${contentType}; charset=UTF-8`);
      lines.push('Content-Transfer-Encoding: 7bit');
      lines.push('');
      lines.push(body);
    }

    const raw = lines.join('\r\n');
    return Buffer.from(raw).toString('base64url');
  }
}
