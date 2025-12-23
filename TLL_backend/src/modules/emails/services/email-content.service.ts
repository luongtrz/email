import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailContent } from '../../../database/entities/email-content.entity';
import { EmbeddingService } from '../../embeddings/embedding.service';

@Injectable()
export class EmailContentService {
  constructor(
    @InjectRepository(EmailContent)
    private emailContentRepository: Repository<EmailContent>,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Store email content with embedding
   */
  async storeEmailWithEmbedding(params: {
    emailId: string;
    userId: string;
    subject: string;
    body: string;
    bodyPreview: string;
    from: { name: string; email: string };
    to: string[];
    date: Date;
  }): Promise<EmailContent> {
    // Check if already exists
    let emailContent = await this.emailContentRepository.findOne({
      where: { emailId: params.emailId, userId: params.userId },
    });

    // Generate embedding
    const embedding = await this.embeddingService.generateEmailEmbedding(
      params.subject,
      params.body,
    );
    const embeddingStr = this.embeddingService.vectorToString(embedding);

    if (emailContent) {
      // Update existing
      emailContent.subject = params.subject;
      emailContent.body = params.body;
      emailContent.bodyPreview = params.bodyPreview;
      emailContent.from = params.from;
      emailContent.to = params.to;
      emailContent.date = params.date;
      emailContent.embedding = embeddingStr;
      emailContent.embeddingModel = 'text-embedding-004';
    } else {
      // Create new
      emailContent = this.emailContentRepository.create({
        ...params,
        embedding: embeddingStr,
        embeddingModel: 'text-embedding-004',
      });
    }

    return this.emailContentRepository.save(emailContent);
  }

  /**
   * Batch store emails (for initial sync)
   */
  async batchStoreEmails(
    emails: any[],
    userId: string,
  ): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        await this.storeEmailWithEmbedding({
          emailId: email.id,
          userId,
          subject: email.subject,
          body: email.body || email.preview, // Use preview if body not available
          bodyPreview: email.preview,
          from: email.from,
          to: email.to,
          date: email.date,
        });
        synced++;
      } catch (error) {
        console.error(`Failed to store email ${email.id}:`, error.message);
        failed++;
        // Continue with next email instead of stopping
      }
    }

    return { synced, failed };
  }

  /**
   * Get email content by ID
   */
  async getEmailContent(
    emailId: string,
    userId: string,
  ): Promise<EmailContent | null> {
    return this.emailContentRepository.findOne({
      where: { emailId, userId },
    });
  }
}
