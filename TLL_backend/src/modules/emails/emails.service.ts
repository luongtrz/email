import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { Email } from './interfaces/email.interface';
import { KanbanEmail } from './interfaces/kanban-email.interface';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';
import { EmailMetadata } from '../../database/entities/email-metadata.entity';
import { KanbanEmailStatus } from '../../database/entities/email-metadata.entity';

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
    @InjectRepository(EmailMetadata)
    private emailMetadataRepo: Repository<EmailMetadata>,
  ) {}

  private async getMetadataMap(userId: string, emailIds: string[]) {
    if (!emailIds.length) {
      return new Map<string, EmailMetadata>();
    }

    const rows = await this.emailMetadataRepo.find({
      where: { userId, emailId: In(emailIds) },
    });

    return new Map(rows.map((row) => [row.emailId, row]));
  }

  private mergeEmailsWithMetadata(
    emails: Email[],
    metadataMap: Map<string, EmailMetadata>,
  ): KanbanEmail[] {
    return emails.map((email) => {
      const meta = metadataMap.get(email.id);
      return {
        ...email,
        status: meta?.status || KanbanEmailStatus.INBOX,
        aiSummary: meta?.aiSummary || null,
        snoozeUntil: meta?.snoozeUntil || null,
      };
    });
  }

  private async ensureMetadata(userId: string, emailId: string) {
    let record = await this.emailMetadataRepo.findOne({
      where: { userId, emailId },
    });

    if (!record) {
      record = this.emailMetadataRepo.create({
        userId,
        emailId,
        status: KanbanEmailStatus.INBOX,
      });
    }

    return record;
  }

  private async generateSummaryWithGemini(text: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new BadRequestException('Gemini API key is not configured');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const fetchFn = (globalThis as any).fetch;

    if (!fetchFn) {
      throw new BadRequestException('Fetch API is not available in this runtime');
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Summarize the following email content concisely:\n\n${text}`,
            },
          ],
        },
      ],
    };

    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `Gemini request failed (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();
    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    if (!summary) {
      throw new BadRequestException('Gemini did not return a summary');
    }

    return summary;
  }

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

  async getKanbanEmails(
    userId: string,
    dto: GetEmailsDto,
  ): Promise<{ emails: KanbanEmail[]; pagination: any }> {
    const base = await this.getEmails(userId, dto);
    const ids = base.emails.map((e) => e.id);
    const metadataMap = await this.getMetadataMap(userId, ids);
    return {
      emails: this.mergeEmailsWithMetadata(base.emails, metadataMap),
      pagination: base.pagination,
    };
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

  async getKanbanEmailDetail(
    userId: string,
    emailId: string,
  ): Promise<KanbanEmail> {
    const email = await this.getEmailById(userId, emailId);
    const metadata = await this.emailMetadataRepo.findOne({
      where: { userId, emailId },
    });

    return {
      ...email,
      status: metadata?.status || KanbanEmailStatus.INBOX,
      aiSummary: metadata?.aiSummary || null,
      snoozeUntil: metadata?.snoozeUntil || null,
    };
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

  async updateStatus(
    userId: string,
    emailId: string,
    dto: UpdateStatusDto,
  ): Promise<{
    emailId: string;
    status: KanbanEmailStatus;
    aiSummary: string | null;
    snoozeUntil: Date | null;
  }> {
    const metadata = await this.ensureMetadata(userId, emailId);
    metadata.previousStatus = metadata.status;
    metadata.status = dto.status;

    if (dto.status !== KanbanEmailStatus.SNOOZED) {
      metadata.snoozeUntil = null;
    }

    const saved = await this.emailMetadataRepo.save(metadata);

    return {
      emailId,
      status: saved.status,
      aiSummary: saved.aiSummary || null,
      snoozeUntil: saved.snoozeUntil || null,
    };
  }

  async snoozeEmail(
    userId: string,
    emailId: string,
    dto: SnoozeDto,
  ): Promise<{
    emailId: string;
    status: KanbanEmailStatus;
    snoozeUntil: Date | null;
    previousStatus: KanbanEmailStatus | null;
  }> {
    const snoozeUntil = new Date(dto.until);
    if (Number.isNaN(snoozeUntil.getTime())) {
      throw new BadRequestException('Invalid snooze date');
    }

    const metadata = await this.ensureMetadata(userId, emailId);
    metadata.previousStatus = metadata.status || KanbanEmailStatus.INBOX;
    metadata.status = KanbanEmailStatus.SNOOZED;
    metadata.snoozeUntil = snoozeUntil;

    const saved = await this.emailMetadataRepo.save(metadata);

    return {
      emailId,
      status: saved.status,
      snoozeUntil: saved.snoozeUntil || null,
      previousStatus: saved.previousStatus || null,
    };
  }

  async restoreSnoozed(userId: string) {
    const now = new Date();
    const snoozed = await this.emailMetadataRepo.find({
      where: {
        userId,
        status: KanbanEmailStatus.SNOOZED,
        snoozeUntil: LessThanOrEqual(now),
      },
    });

    if (!snoozed.length) {
      return { restored: 0 };
    }

    const restored = snoozed.map((record) => {
      record.status = record.previousStatus || KanbanEmailStatus.INBOX;
      record.previousStatus = null;
      record.snoozeUntil = null;
      return record;
    });

    await this.emailMetadataRepo.save(restored);

    return { restored: restored.length };
  }

  async summarizeEmail(
    userId: string,
    emailId: string,
    dto: SummarizeDto,
  ): Promise<{ summary: string }> {
    let text = dto.text;

    if (!text) {
      const message = await this.gmailApiService.getMessage(userId, emailId);
      const parsed = this.gmailParserService.parseMessage(message);
      text = parsed.body || parsed.preview;
    }

    if (!text || !text.trim()) {
      throw new BadRequestException('No email content available to summarize');
    }

    const summary = await this.generateSummaryWithGemini(text);
    const metadata = await this.ensureMetadata(userId, emailId);
    metadata.aiSummary = summary;

    await this.emailMetadataRepo.save(metadata);

    return { summary };
  }

  async semanticSearch(userId: string, query: string) {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query is required');
    }

    const result = await this.gmailApiService.searchMessages(userId, query);
    const messageIds = (result.messages || [])
      .map((msg) => msg.id || '')
      .filter(Boolean);

    if (!messageIds.length) {
      return { emails: [], pagination: { total: 0 } };
    }

    const messages = await this.gmailApiService.getMessages(userId, messageIds);
    const emails = messages.map((msg) =>
      this.gmailParserService.parseMessage(msg),
    );
    const metadataMap = await this.getMetadataMap(
      userId,
      emails.map((e) => e.id),
    );

    return {
      emails: this.mergeEmailsWithMetadata(emails, metadataMap),
      pagination: {
        total: result.resultSizeEstimate || emails.length,
        nextPageToken: result.nextPageToken,
      },
    };
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
