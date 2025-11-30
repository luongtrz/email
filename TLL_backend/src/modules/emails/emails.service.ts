import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { Email } from './interfaces/email.interface';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';

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

  constructor(
    private gmailApiService: GmailApiService,
    private gmailParserService: GmailParserService,
  ) {}

  async getMailboxes(userId: string) {
    const labels = await this.gmailApiService.listLabels(userId);

    // Standard mailboxes
    const standardMailboxes = [
      { id: 'inbox', name: 'Inbox', icon: 'inbox', color: '#4285f4' },
      { id: 'sent', name: 'Sent', icon: 'send', color: '#34a853' },
      { id: 'drafts', name: 'Drafts', icon: 'drafts', color: '#fbbc04' },
      { id: 'trash', name: 'Trash', icon: 'delete', color: '#ea4335' },
      { id: 'spam', name: 'Spam', icon: 'report', color: '#ea4335' },
      { id: 'important', name: 'Important', icon: 'label_important', color: '#fbbc04' },
      { id: 'starred', name: 'Starred', icon: 'star', color: '#fbbc04' },
    ];

    // Get message counts for each mailbox
    const mailboxesWithCounts = await Promise.all(
      standardMailboxes.map(async (mailbox) => {
        const labelId = this.folderToLabelMap[mailbox.id];
        if (!labelId) {
          return { ...mailbox, count: 0 };
        }

        try {
          const result = await this.gmailApiService.listMessages(userId, {
            labelIds: [labelId],
            maxResults: 1,
          });
          return {
            ...mailbox,
            count: result.resultSizeEstimate || 0,
          };
        } catch (error) {
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

    const messageIds = (result.messages || []).map((msg) => msg.id || '').filter(Boolean);

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
    const emails = messages.map((msg) => this.gmailParserService.parseMessage(msg));

    // Sort by date descending
    emails.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Paginate in memory (for now)
    const start = (page - 1) * limit;
    const paginatedEmails = emails.slice(start, start + limit);

    return {
      emails: paginatedEmails,
      pagination: {
        total: result.resultSizeEstimate || emails.length,
        page,
        limit,
        totalPages: Math.ceil((result.resultSizeEstimate || emails.length) / limit),
        nextPageToken: result.nextPageToken,
      },
    };
  }

  async getEmailById(userId: string, emailId: string): Promise<Email> {
    try {
      const message = await this.gmailApiService.getMessage(userId, emailId);
      const email = this.gmailParserService.parseMessage(message);

      // Mark as read if unread
      if (!email.read) {
        await this.gmailApiService.modifyMessage(userId, emailId, [], ['UNREAD']);
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
      const result = await this.gmailApiService.sendMessage(userId, to, subject, body, {
        cc,
        bcc,
        replyTo,
      });

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
    const { addLabels, removeLabels, markAsRead, star, archive } = dto;

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
      const attachments = this.gmailParserService.parseAttachments(message.payload);

      const attachmentInfo = attachments.find((att) => att.id === attachmentId);
      if (!attachmentInfo) {
        throw new NotFoundException('Attachment not found in message');
      }

      // Get attachment data
      const attachment = await this.gmailApiService.getAttachment(userId, messageId, attachmentId);
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
      throw new BadRequestException('Failed to get attachment: ' + error.message);
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
