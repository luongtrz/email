import { Injectable } from '@nestjs/common';
import { GmailApiService } from './gmail-api.service';
import { GmailParserService } from './gmail-parser.service';
import { MailRepository } from '../repositories/mail.repository';
import { normalizeText } from '../utils/text-normalizer.util';

@Injectable()
export class GmailSyncService {
  constructor(
    private gmailApiService: GmailApiService,
    private gmailParserService: GmailParserService,
    private mailRepository: MailRepository,
  ) {}

  async syncInboxEmails(
    userId: string,
    maxResults: number = 100,
  ): Promise<{
    total: number;
    new: number;
    skipped: number;
  }> {
    // Step 1: Fetch message list from inbox
    const result = await this.gmailApiService.listMessages(userId, {
      labelIds: ['INBOX'],
      maxResults,
    });

    const messageIds = (result.messages || [])
      .map((msg) => msg.id || '')
      .filter(Boolean);

    if (messageIds.length === 0) {
      return {
        total: 0,
        new: 0,
        skipped: 0,
      };
    }

    // Step 2: Fetch full message details
    const messages = await this.gmailApiService.getMessages(userId, messageIds);

    // Step 3: Parse and normalize emails
    const mailsToSync = messages.map((msg) => {
      const email = this.gmailParserService.parseMessage(msg);

      const fromEmail =
        email.from?.email || email.from?.toString() || 'unknown';
      const subject = email.subject || '';

      return {
        userId,
        gmailMessageId: email.id,
        from: fromEmail,
        subject,
        snippet: email.snippet || '',
        receivedAt: email.date,
        fromNormalized: normalizeText(fromEmail),
        subjectNormalized: normalizeText(subject),
      };
    });

    // Step 4: Bulk upsert to database (skip duplicates)
    const { inserted, skipped } =
      await this.mailRepository.bulkUpsert(mailsToSync,);

    return {
      total: messageIds.length,
      new: inserted,
      skipped,
    };
  }
}
