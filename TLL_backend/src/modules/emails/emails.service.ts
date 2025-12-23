import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { Email } from './interfaces/email.interface';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';
import { EmailContentService } from './services/email-content.service';

@Injectable()
export class EmailsService {
  // Map Gmail labels to mailbox folders
  private readonly labelToFolderMap: Record<string, string> = {
    INBOX: 'inbox',
    SENT: 'sent',
    DRAFT: 'drafts',
    TRASH: 'trash',
    SPAM: 'spam',
    IMPORTANT: 'important',
    STARRED: 'starred',
  };

  private readonly folderToLabelMap: Record<string, string> = {
    inbox: 'INBOX',
    sent: 'SENT',
    drafts: 'DRAFT',
    trash: 'TRASH',
    spam: 'SPAM',
    important: 'IMPORTANT',
    starred: 'STARRED',
  };

  private readonly logger = new Logger(EmailsService.name);

  constructor(
    private gmailApiService: GmailApiService,
    private gmailParserService: GmailParserService,
    private emailContentService: EmailContentService,
  ) {}

  async getMailboxes(userId: string) {
    // Standard mailboxes
    const standardMailboxes = [
      { id: 'inbox', name: 'Inbox', icon: 'inbox', color: '#4285f4' },
      { id: 'sent', name: 'Sent', icon: 'send', color: '#34a853' },
      { id: 'drafts', name: 'Drafts', icon: 'drafts', color: '#fbbc04' },
      { id: 'trash', name: 'Trash', icon: 'delete', color: '#ea4335' },
      { id: 'spam', name: 'Spam', icon: 'report', color: '#ea4335' },
      {
        id: 'important',
        name: 'Important',
        icon: 'label_important',
        color: '#fbbc04',
      },
      { id: 'starred', name: 'Starred', icon: 'star', color: '#fbbc04' },
    ];

    // Fetch message counts for each mailbox label in parallel
    const mailboxesWithCounts = await Promise.all(
      standardMailboxes.map(async (mailbox) => {
        const labelId = this.folderToLabelMap[mailbox.id];
        if (!labelId) {
          return { ...mailbox, count: 0 };
        }

        try {
          // Get full label details including message count
          const label = await this.gmailApiService.getLabel(userId, labelId);
          const count = label.messagesTotal || 0;

          return {
            ...mailbox,
            count,
          };
        } catch (error) {
          console.warn(
            `Failed to get count for label ${labelId}:`,
            error.message,
          );
          return { ...mailbox, count: 0 };
        }
      }),
    );
    return mailboxesWithCounts;
  }

  async getEmails(userId: string, dto: GetEmailsDto) {
    const { folder, search, page = 1, limit = 20 } = dto;

    // Build Gmail query
    let query = '';
    const labelIds: string[] = [];

    if (folder) {
      const labelId = this.folderToLabelMap[folder.toLowerCase()];
      if (labelId) {
        labelIds.push(labelId);
      } else {
        throw new BadRequestException(`Invalid folder: ${folder}`);
      }
    }

    if (search) {
      query = search;
    }

    // Calculate page token (Gmail API uses pageToken, not page number)
    // For simplicity, we'll fetch all messages and paginate in memory
    // In production, you might want to implement proper pageToken handling
    const maxResults = limit * page; // Fetch enough to cover current page

    const result = await this.gmailApiService.listMessages(userId, {
      labelIds: labelIds.length > 0 ? labelIds : undefined,
      q: query || undefined,
      maxResults,
    });

    const messageIds = (result.messages || [])
      .map((msg) => msg.id || '')
      .filter(Boolean);

    if (messageIds.length === 0) {
      return {
        emails: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Get full message details
    const messages = await this.gmailApiService.getMessages(userId, messageIds);
    const emails = messages.map((msg) =>
      this.gmailParserService.parseMessage(msg),
    );

    // Sort by date descending
    emails.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Paginate in memory (for now)
    const start = (page - 1) * limit;
    const paginatedEmails = emails.slice(start, start + limit);

    // Auto-sync if requested (fire-and-forget)
    if (dto.autoSync) {
      this.autoSyncEmails(paginatedEmails, userId).catch((err) => {
        this.logger.warn(`Auto-sync failed for user ${userId}: ${err.message}`);
      });
    }

    return {
      emails: paginatedEmails,
      pagination: {
        total: result.resultSizeEstimate || emails.length,
        page,
        limit,
        totalPages: Math.ceil(
          (result.resultSizeEstimate || emails.length) / limit,
        ),
        nextPageToken: result.nextPageToken,
      },
    };
  }

  /**
   * Auto-sync emails with embeddings in background
   * Fire-and-forget pattern - errors are logged but don't block the request
   */
  private async autoSyncEmails(emails: Email[], userId: string): Promise<void> {
    this.logger.log(`Auto-syncing ${emails.length} emails for user ${userId}`);
    const results = await this.emailContentService.batchStoreEmails(emails, userId);
    this.logger.log(`Auto-sync completed: ${results.synced} synced, ${results.failed} failed`);
  }

  async getEmailById(userId: string, emailId: string): Promise<Email> {
    try {
      const message = await this.gmailApiService.getMessage(userId, emailId);
      const email = this.gmailParserService.parseMessage(message);

      // Mark as read if unread
      if (!email.read) {
        await this.gmailApiService.modifyMessage(
          userId,
          emailId,
          [],
          ['UNREAD'],
        );
      }

      return email;
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException('Email not found');
      }
      throw error;
    }
  }

  async sendEmail(userId: string, dto: SendEmailDto) {
    const { to, subject, body, cc, bcc, replyTo } = dto;

    try {
      const result = await this.gmailApiService.sendMessage(
        userId,
        to,
        subject,
        body,
        {
          cc,
          bcc,
          replyTo,
        },
      );

      return {
        message: 'Email sent successfully',
        messageId: result.id,
        threadId: result.threadId,
      };
    } catch (error) {
      throw new BadRequestException('Failed to send email: ' + error.message);
    }
  }

  async modifyEmail(userId: string, emailId: string, dto: ModifyEmailDto) {
    const {
      addLabels,
      removeLabels,
      markAsRead,
      star,
      unstar,
      archive,
      delete: moveToTrash,
      permanentDelete,
    } = dto;

    // Handle permanent delete first (cannot be undone)
    if (permanentDelete) {
      try {
        await this.gmailApiService.deleteMessage(userId, emailId);
        return {
          message: 'Email permanently deleted',
          messageId: emailId,
        };
      } catch (error) {
        if (error.status === 404) {
          throw new NotFoundException('Email not found');
        }
        throw new BadRequestException(
          'Failed to delete email: ' + error.message,
        );
      }
    }

    // Handle move to trash
    if (moveToTrash) {
      try {
        const result = await this.gmailApiService.trashMessage(userId, emailId);
        return {
          message: 'Email moved to trash',
          messageId: result.id,
          labelIds: result.labelIds,
        };
      } catch (error) {
        if (error.status === 404) {
          throw new NotFoundException('Email not found');
        }
        throw new BadRequestException(
          'Failed to move email to trash: ' + error.message,
        );
      }
    }

    const labelsToAdd: string[] = addLabels || [];
    const labelsToRemove: string[] = removeLabels || [];

    // Handle convenience flags
    if (markAsRead !== undefined) {
      if (markAsRead) {
        labelsToRemove.push('UNREAD');
      } else {
        labelsToAdd.push('UNREAD');
      }
    }

    if (star !== undefined) {
      if (star) {
        labelsToAdd.push('STARRED');
      } else {
        labelsToRemove.push('STARRED');
      }
    }

    if (unstar) {
      labelsToRemove.push('STARRED');
    }

    if (archive !== undefined) {
      if (archive) {
        labelsToRemove.push('INBOX');
      } else {
        labelsToAdd.push('INBOX');
      }
    }

    try {
      const result = await this.gmailApiService.modifyMessage(
        userId,
        emailId,
        labelsToAdd.length > 0 ? labelsToAdd : undefined,
        labelsToRemove.length > 0 ? labelsToRemove : undefined,
      );

      return {
        message: 'Email modified successfully',
        messageId: result.id,
        labelIds: result.labelIds,
      };
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException('Email not found');
      }
      throw new BadRequestException('Failed to modify email: ' + error.message);
    }
  }

  async getAttachment(userId: string, messageId: string, attachmentId: string) {
    try {
      // Get message to find attachment details
      const message = await this.gmailApiService.getMessage(userId, messageId);
      const attachments = this.gmailParserService.parseAttachments(
        message.payload,
      );

      const attachmentInfo = attachments.find((att) => att.id === attachmentId);
      if (!attachmentInfo) {
        throw new NotFoundException('Attachment not found in message');
      }

      // Get attachment data
      const attachment = await this.gmailApiService.getAttachment(
        userId,
        messageId,
        attachmentId,
      );
      const data = Buffer.from(attachment.data || '', 'base64');

      return {
        data,
        size: attachment.size || 0,
        filename: attachmentInfo.name,
        contentType: attachmentInfo.type,
      };
    } catch (error) {
      if (error.status === 404 || error instanceof NotFoundException) {
        throw new NotFoundException('Attachment not found');
      }
      throw new BadRequestException(
        'Failed to get attachment: ' + error.message,
      );
    }
  }

  // Reply to an email
  async replyEmail(
    userId: string,
    emailId: string,
    dto: { body: string; cc?: string[]; bcc?: string[]; replyAll?: boolean },
  ) {
    try {
      // Get the original email
      const originalMessage = await this.gmailApiService.getMessage(
        userId,
        emailId,
      );
      const originalEmail =
        this.gmailParserService.parseMessage(originalMessage);

      // Determine recipients
      const toRecipients: string[] = [originalEmail.from.email];
      let ccRecipients: string[] = dto.cc || [];

      // If reply all, include original CC and To recipients (excluding self)
      if (dto.replyAll) {
        const profile = await this.gmailApiService.getProfile(userId);
        const userEmail = profile.emailAddress?.toLowerCase();

        // Add original To recipients (excluding self)
        originalEmail.to.forEach((recipient: string) => {
          if (
            recipient.toLowerCase() !== userEmail &&
            !toRecipients.includes(recipient)
          ) {
            toRecipients.push(recipient);
          }
        });

        // Add original CC recipients (excluding self)
        originalEmail.cc?.forEach((recipient: string) => {
          if (
            recipient.toLowerCase() !== userEmail &&
            !ccRecipients.includes(recipient)
          ) {
            ccRecipients.push(recipient);
          }
        });
      }

      // Format reply body with quoted original message
      const replyBody = `
${dto.body}

<br/><br/>
<div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px; color: #666;">
  <p>On ${new Date(originalEmail.date).toLocaleString()}, ${
        originalEmail.from.name
      } &lt;${originalEmail.from.email}&gt; wrote:</p>
  ${originalEmail.body}
</div>
      `.trim();

      // Send the reply
      const result = await this.gmailApiService.sendMessage(
        userId,
        toRecipients,
        `Re: ${originalEmail.subject.replace(/^Re:\s*/i, '')}`,
        replyBody,
        {
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: dto.bcc,
          replyTo: originalEmail.from.email,
          threadId: originalEmail.threadId,
          references: emailId,
          inReplyTo: emailId,
        },
      );

      return {
        message: 'Reply sent successfully',
        messageId: result.id,
        threadId: result.threadId,
      };
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException('Original email not found');
      }
      throw new BadRequestException('Failed to send reply: ' + error.message);
    }
  }

  // Forward an email
  async forwardEmail(
    userId: string,
    emailId: string,
    dto: { to: string[]; body?: string; cc?: string[]; bcc?: string[] },
  ) {
    try {
      // Get the original email
      const originalMessage = await this.gmailApiService.getMessage(
        userId,
        emailId,
      );
      const originalEmail =
        this.gmailParserService.parseMessage(originalMessage);

      // Format forward body with original message
      const forwardBody = `
${dto.body || ''}

<br/><br/>
<div style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px;">
  <p><strong>---------- Forwarded message ----------</strong></p>
  <p><strong>From:</strong> ${originalEmail.from.name} &lt;${
        originalEmail.from.email
      }&gt;</p>
  <p><strong>Date:</strong> ${new Date(originalEmail.date).toLocaleString()}</p>
  <p><strong>Subject:</strong> ${originalEmail.subject}</p>
  <p><strong>To:</strong> ${originalEmail.to.join(', ')}</p>
  ${
    originalEmail.cc?.length > 0
      ? `<p><strong>Cc:</strong> ${originalEmail.cc.join(', ')}</p>`
      : ''
  }
  <br/>
  ${originalEmail.body}
</div>
      `.trim();

      // Get attachments from original email to forward
      const attachments = this.gmailParserService.parseAttachments(
        originalMessage.payload,
      );
      const attachmentData: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
      }> = [];

      // Fetch and include original attachments
      for (const att of attachments) {
        try {
          const attachmentResult = await this.gmailApiService.getAttachment(
            userId,
            emailId,
            att.id,
          );
          attachmentData.push({
            filename: att.name,
            content: Buffer.from(attachmentResult.data || '', 'base64'),
            contentType: att.type,
          });
        } catch (err) {
          console.warn(`Failed to fetch attachment ${att.name}:`, err.message);
        }
      }

      // Send the forwarded email
      const result = await this.gmailApiService.sendMessage(
        userId,
        dto.to,
        `Fwd: ${originalEmail.subject.replace(/^Fwd:\s*/i, '')}`,
        forwardBody,
        {
          cc: dto.cc,
          bcc: dto.bcc,
          attachments: attachmentData.length > 0 ? attachmentData : undefined,
        },
      );

      return {
        message: 'Email forwarded successfully',
        messageId: result.id,
        threadId: result.threadId,
      };
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException('Original email not found');
      }
      throw new BadRequestException(
        'Failed to forward email: ' + error.message,
      );
    }
  }

  // Get Gmail labels for Kanban column configuration
  async getGmailLabels(userId: string) {
    try {
      const labels = await this.gmailApiService.listLabels(userId);

      // Filter out system labels we don't want users to map to columns
      // We exclude labels that are already used for mailbox folders or are internal
      const filteredLabels = labels.filter(label =>
        !['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'UNREAD', 'STARRED', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'].includes(label.id)
      );

      // Sort: user labels first, then system labels
      return filteredLabels.sort((a, b) => {
        if (a.type === 'user' && b.type !== 'user') return -1;
        if (a.type !== 'user' && b.type === 'user') return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      throw new BadRequestException('Failed to fetch Gmail labels: ' + error.message);
    }
  }

  // Legacy methods for backward compatibility
  async markAsRead(userId: string, emailId: string) {
    return this.modifyEmail(userId, emailId, { markAsRead: true });
  }

  async toggleStar(userId: string, emailId: string) {
    // Get current email to check if starred
    const email = await this.getEmailById(userId, emailId);
    return this.modifyEmail(userId, emailId, { star: !email.starred });
  }
}
