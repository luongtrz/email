import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { EmailsService } from '../emails/emails.service';
import { GmailApiService } from '../emails/services/gmail-api.service';
import { GmailParserService } from '../emails/services/gmail-parser.service';
import { GetEmailsDto } from '../emails/dto/get-emails.dto';
import {
  GetKanbanEmailsDto,
  SortOption,
} from './dto/get-kanban-emails.dto';
import { GetInitialKanbanEmailsDto, InitialLoadFolder } from './dto/get-initial-kanban-emails.dto';
import { Email } from '../emails/interfaces/email.interface';
import { EmailMetadata } from '@/database/entities/email-metadata.entity';
import { KanbanEmailStatus } from '@/database/entities/email-metadata.entity';
import { KanbanEmail } from './interfaces/kanban-email.interface';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class KanbanEmailsService {
  constructor(
    private emailsService: EmailsService,
    private gmailApiService: GmailApiService,
    private gmailParserService: GmailParserService,
    @InjectRepository(EmailMetadata)
    private emailMetadataRepo: Repository<EmailMetadata>,
    private configService: ConfigService,
  ) { }

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
        status: (meta?.status || KanbanEmailStatus.INBOX) as KanbanEmailStatus,
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

  private getGeminiModel() {
    const apiKey = this.configService.get<string>('app.gemini.apiKey');
    const modelId =
      this.configService.get<string>('app.gemini.model') || 'gemini-flash-latest';

    if (!apiKey) {
      throw new BadRequestException('Gemini API key is not configured');
    }

    const client = new GoogleGenerativeAI(apiKey);
    return client.getGenerativeModel({ model: modelId });
  }

  private async generateSummaryWithGemini(text: string): Promise<string> {
    try {
      const model = this.getGeminiModel();
      const prompt = `You are an intelligent email assistant. Analyze the following email and provide a well-structured HTML summary.

Email content:
${text}

Please provide a summary in clean HTML format with the following structure:
- Use <div> with appropriate styling classes
- Use <strong> for important information (sender, subject, deadlines, action items)
- Use <ul> and <li> for bullet points when listing items
- Use <p> for paragraphs with proper spacing
- Highlight urgent or important items with <span> tags
- Use emojis where appropriate (📧 for email info, ⚡ for urgent, ✅ for action items, 📅 for dates)

Structure your response like this:
<div class="email-summary">
  <p><strong>Main Topic:</strong> Brief description</p>
  <p><strong>Key Points:</strong></p>
  <ul>
    <li>Point 1</li>
    <li>Point 2</li>
  </ul>
  <p><strong>Action Items:</strong> What needs to be done (if any)</p>
  <p><strong>Important Dates:</strong> Any mentioned dates or deadlines (if any)</p>
</div>

Important: Return ONLY the HTML content without any markdown code blocks or backticks. Start directly with <div>.`;

      const result = await model.generateContent(prompt);

      const summary =
        result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        null;

      if (!summary) {
        throw new BadRequestException('Gemini did not return a summary');
      }

      // Clean up any potential markdown code blocks
      let cleanSummary = summary
        .replace(/```html\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return cleanSummary;
    } catch (error) {
      console.error('Error generating summary with Gemini:', error);
      throw new BadRequestException('Failed to generate summary with Gemini');
    }
  }

  /**
   * Check if a Gmail message has attachments
   * @param message - Gmail message object
   * @returns true if message has attachments, false otherwise
   */
  private checkHasAttachment(message: any): boolean {
    if (!message.payload) return false;

    // Check if payload has parts with filename (attachments)
    if (message.payload.parts) {
      return message.payload.parts.some(
        (part: any) =>
          part.filename && part.filename.length > 0 && part.body?.attachmentId,
      );
    }

    // Check if the main payload has a filename (single attachment)
    return !!(
      message.payload.filename &&
      message.payload.filename.length > 0 &&
      message.payload.body?.attachmentId
    );
  }

  /**
   * Apply Gmail-based filters to emails
   * WHY IN-MEMORY FILTERING:
   * Gmail API does not support complex query combinations for all our filters.
   * We must fetch emails first, then filter based on Gmail message properties.
   *
   * @param messages - Array of Gmail message objects
   * @param dto - Filter parameters
   * @returns Filtered array of Gmail messages
   */
  private filterEmailsByGmailCriteria(
    messages: any[],
    dto: GetKanbanEmailsDto,
  ): any[] {
    let filtered = messages;

    // Filter by unread status
    if (dto.isUnread !== undefined) {
      filtered = filtered.filter((msg) => {
        const isUnread = msg.labelIds?.includes('UNREAD') || false;
        return isUnread === dto.isUnread;
      });
    }

    // Filter by attachment presence
    if (dto.hasAttachment !== undefined) {
      filtered = filtered.filter((msg) => {
        const hasAttachment = this.checkHasAttachment(msg);
        return hasAttachment === dto.hasAttachment;
      });
    }

    // Filter by sender email (partial match, case-insensitive)
    if (dto.from) {
      const fromLower = dto.from.toLowerCase();
      filtered = filtered.filter((msg) => {
        const headers = msg.payload?.headers || [];
        const fromHeader = headers.find(
          (h: any) => h.name.toLowerCase() === 'from',
        );
        if (!fromHeader) return false;

        const fromValue = fromHeader.value.toLowerCase();
        return fromValue.includes(fromLower);
      });
    }

    return filtered;
  }

  /**
   * Sort emails based on sort option
   * WHY IN-MEMORY SORTING:
   * - Emails come from two sources: Gmail API (read-only) and EmailMetadata (database)
   * - We need to merge data from both sources before sorting
   * - Gmail API does not support custom sort orders
   * - Sorting must happen after filtering to ensure correct results
   *
   * @param emails - Array of parsed Email objects
   * @param sortOption - Sort option enum
   * @returns Sorted array of emails
   */
  private sortEmails(emails: KanbanEmail[], sortOption: SortOption): KanbanEmail[] {
    const sorted = [...emails];

    switch (sortOption) {
      case SortOption.DATE_DESC:
        // Newest first (default Gmail behavior)
        sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;

      case SortOption.DATE_ASC:
        // Oldest first
        sorted.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;

      case SortOption.SENDER_ASC:
        // Alphabetical by sender name or email
        sorted.sort((a, b) => {
          const senderA = (a.from.name || a.from.email).toLowerCase();
          const senderB = (b.from.name || b.from.email).toLowerCase();
          return senderA.localeCompare(senderB);
        });
        break;

      default:
        // Default to date descending
        sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return sorted;
  }

  /**
   * Initial load: Fetch emails from Gmail and create default metadata
   * Use this endpoint on first load to populate metadata for new users
   * 
   * @param userId - User ID
   * @param dto - Initial load parameters (folder, limit, search)
   * @returns Array of emails with metadata
   */
  async getInitialKanbanEmails(
    userId: string,
    dto: GetInitialKanbanEmailsDto,
  ): Promise<{ items: any[]; total: number; newMetadataCount: number }> {
    try {
      // STEP 1: Fetch emails from Gmail
      const gmailLabel = dto.folder === InitialLoadFolder.ALL ? undefined : dto.folder;
      const maxResults = Math.min(dto.limit || 50, 100); // Cap at 100

      const listResult = await this.gmailApiService.listMessages(userId, {
        labelIds: gmailLabel ? [gmailLabel] : undefined,
        q: dto.search,
        maxResults,
      });

      if (!listResult.messages || listResult.messages.length === 0) {
        return { items: [], total: 0, newMetadataCount: 0 };
      }

      const emailIds = listResult.messages.map((m) => m.id).filter(Boolean);

      // STEP 2: Get full message details from Gmail
      const messages = await this.gmailApiService.getMessages(userId, emailIds);

      // STEP 3: Parse emails
      const parsedEmails = messages.map((msg) =>
        this.gmailParserService.parseMessage(msg),
      );

      // STEP 4: Get or create metadata (default status = INBOX)
      const metadataMap = await this.getMetadataMap(
        userId,
        parsedEmails.map((e) => e.id),
      );

      const missingMetadata: EmailMetadata[] = [];
      for (const email of parsedEmails) {
        if (!metadataMap.has(email.id)) {
          const newMeta = this.emailMetadataRepo.create({
            userId,
            emailId: email.id,
            status: KanbanEmailStatus.INBOX, // Default to INBOX
          });
          missingMetadata.push(newMeta);
          metadataMap.set(email.id, newMeta);
        }
      }

      // STEP 5: Save missing metadata in batch
      if (missingMetadata.length > 0) {
        await this.emailMetadataRepo.save(missingMetadata);
        console.log(
          `[Initial Load] Created ${missingMetadata.length} new email metadata records for user ${userId}`,
        );
      }

      // STEP 6: Merge emails with metadata
      const mergedEmails = this.mergeEmailsWithMetadata(
        parsedEmails,
        metadataMap,
      );

      // STEP 7: Sort by date descending (newest first)
      const sortedEmails = this.sortEmails(mergedEmails, SortOption.DATE_DESC);

      // STEP 8: Format response
      const items = sortedEmails.map((email) => ({
        emailId: email.id,
        sender: `${email.from.name} <${email.from.email}>`,
        subject: email.subject,
        snippet: email.preview,
        status: email.status,
        aiSummary: email.aiSummary,
        snoozeUntil: email.snoozeUntil,
        updatedAt: metadataMap.get(email.id)?.updatedAt || new Date(),
        date: email.date,
        isUnread: email.read === false,
        starred: email.starred || false,
        hasAttachment: email.attachments && email.attachments.length > 0,
      }));

      return {
        items,
        total: items.length,
        newMetadataCount: missingMetadata.length,
      };
    } catch (error) {
      console.error('[Initial Load] Error fetching emails from Gmail:', error);
      if (error.code === 404) {
        return { items: [], total: 0, newMetadataCount: 0 };
      }
      throw error;
    }
  }

  async getKanbanEmails(
    userId: string,
    dto: GetEmailsDto,
  ): Promise<{ emails: KanbanEmail[]; pagination: any }> {
    const base = await this.emailsService.getEmails(userId, dto);
    const ids = base.emails.map((e) => e.id);
    const metadataMap = await this.getMetadataMap(userId, ids);
    return {
      emails: this.mergeEmailsWithMetadata(base.emails, metadataMap),
      pagination: base.pagination,
    };
  }

  async getKanbanEmailsWithFilters(
    userId: string,
    dto: GetKanbanEmailsDto,
  ): Promise<{ items: any[]; total: number }> {
    const whereClause: any = { userId };

    // Filter by status (from localStorage column)
    if (dto.status) {
      whereClause.status = dto.status;
    }

    let metadataRecords = await this.emailMetadataRepo.find({
      where: whereClause,
    });

    // AUTO-INITIALIZE: If no metadata exists, fetch from Gmail and create metadata
    if (metadataRecords.length === 0) {
      // Fetch initial emails from Gmail to populate metadata
      const initialResult = await this.getInitialKanbanEmails(userId, {
        folder: InitialLoadFolder.INBOX,
        limit: 50,
      });

      if (initialResult.newMetadataCount === 0) {
        // No emails found in Gmail
        return { items: [], total: 0 };
      }

      console.log(
        `[Auto-Initialize] Created ${initialResult.newMetadataCount} metadata records. Retrying filter...`,
      );

      // Retry: Query metadata again after initialization
      metadataRecords = await this.emailMetadataRepo.find({
        where: whereClause,
      });

      if (metadataRecords.length === 0) {
        return { items: [], total: 0 };
      }
    }

    const now = new Date();
    let filteredMetadata = metadataRecords;
    if (dto.status !== KanbanEmailStatus.SNOOZED) {
      filteredMetadata = metadataRecords.filter(
        (meta) => !meta.snoozeUntil || meta.snoozeUntil <= now,
      );
    }

    if (filteredMetadata.length === 0) {
      return { items: [], total: 0 };
    }

    const emailIds = filteredMetadata.map((meta) => meta.emailId);

    try {
      const messages = await this.gmailApiService.getMessages(userId, emailIds);
      const filteredMessages = this.filterEmailsByGmailCriteria(messages, dto);

      if (filteredMessages.length === 0) {
        return { items: [], total: 0 };
      }

      const parsedEmails = filteredMessages.map((msg) =>
        this.gmailParserService.parseMessage(msg),
      );

      const metadataMap = await this.getMetadataMap(
        userId,
        parsedEmails.map((e) => e.id),
      );
      const mergedEmails = this.mergeEmailsWithMetadata(
        parsedEmails,
        metadataMap,
      );

      const sortedEmails = this.sortEmails(mergedEmails, dto.sort);

      const total = sortedEmails.length;
      const start = dto.offset || 0;
      const end = start + (dto.limit || 20);
      const paginatedEmails = sortedEmails.slice(start, end);

      const items = paginatedEmails.map((email) => ({
        emailId: email.id,
        sender: `${email.from.name} <${email.from.email}>`,
        subject: email.subject,
        snippet: email.preview,
        status: email.status,
        aiSummary: email.aiSummary,
        snoozeUntil: email.snoozeUntil || null,
        updatedAt: metadataMap.get(email.id)?.updatedAt || new Date(),
        date: email.date,
        isUnread: email.read === false,
        starred: email.starred || false,
        hasAttachment: email.attachments && email.attachments.length > 0,
      }));

      return { items, total };
    } catch (error) {
      console.error('Error fetching emails from Gmail:', error);
      if (error.code === 404) {
        return { items: [], total: 0 };
      }
      throw error;
    }
  }

  async getKanbanEmailDetail(
    userId: string,
    emailId: string,
  ): Promise<KanbanEmail> {
    const email = await this.emailsService.getEmailById(userId, emailId);
    const metadata = await this.emailMetadataRepo.findOne({
      where: { userId, emailId },
    });

    return {
      ...email,
      status: (metadata?.status || KanbanEmailStatus.INBOX) as KanbanEmailStatus,
      aiSummary: metadata?.aiSummary || null,
      snoozeUntil: metadata?.snoozeUntil || null,
    };
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

    // Update status directly from frontend (localStorage)
    metadata.status = dto.status as any;

    // Clear snooze if moving away from snoozed status
    if (dto.status !== 'SNOOZED') {
      metadata.snoozeUntil = null;
    }

    const saved = await this.emailMetadataRepo.save(metadata);

    // Sync Gmail labels: add new custom label, remove old custom label
    // This is supplementary - we don't fail the operation if label sync fails
    if (dto.gmailLabelId || dto.previousGmailLabelId) {
      try {
        const labelsToAdd: string[] = dto.gmailLabelId ? [dto.gmailLabelId] : [];
        const labelsToRemove: string[] = [];

        // Remove previous custom label (NOT system labels like INBOX, SENT)
        if (dto.previousGmailLabelId && !this.isSystemLabel(dto.previousGmailLabelId)) {
          labelsToRemove.push(dto.previousGmailLabelId);
        }

        // Apply label changes if there are any
        if (labelsToAdd.length > 0 || labelsToRemove.length > 0) {
          await this.gmailApiService.modifyMessage(
            userId,
            emailId,
            labelsToAdd,
            labelsToRemove,
          );
        }
      } catch (error) {
        // Log error but don't fail the status update
        // The database status is the source of truth
        console.error(`Failed to sync Gmail labels for email ${emailId}:`, error.message);
      }
    }

    return {
      emailId,
      status: saved.status as KanbanEmailStatus,
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
      status: saved.status as KanbanEmailStatus,
      snoozeUntil: saved.snoozeUntil || null,
      previousStatus: (saved.previousStatus || null) as KanbanEmailStatus | null,
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

  /**
   * Check if a Gmail label ID is a system label
   * System labels should not be removed when cleaning up custom labels
   */
  private isSystemLabel(labelId: string): boolean {
    const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED', 'UNREAD'];
    return systemLabels.includes(labelId);
  }
}

