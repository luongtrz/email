import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { EmailsService } from '../emails/emails.service';
import { GmailApiService } from '../emails/services/gmail-api.service';
import { GmailParserService } from '../emails/services/gmail-parser.service';
import { GetEmailsDto } from '../emails/dto/get-emails.dto';
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
      status: metadata?.status || KanbanEmailStatus.INBOX,
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
}

