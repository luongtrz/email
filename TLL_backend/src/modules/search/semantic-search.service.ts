import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailContent } from '../../database/entities/email-content.entity';
import { EmbeddingService } from '../embeddings/embedding.service';
import { GmailSearchService } from '../emails/services/gmail-search.service';

interface SemanticSearchResult {
  emailId: string;
  subject: string;
  bodyPreview: string;
  from: { name: string; email: string };
  to: string[];
  date: Date;
  similarity: number;
  source: 'semantic' | 'keyword' | 'both';
}

@Injectable()
export class SemanticSearchService {
  constructor(
    @InjectRepository(EmailContent)
    private emailContentRepository: Repository<EmailContent>,
    private embeddingService: EmbeddingService,
    private gmailSearchService: GmailSearchService,
  ) {}

  /**
   * Hybrid search: Combine semantic and keyword search
   */
  async hybridSearch(
    userId: string,
    query: string,
    options: { limit?: number; minSimilarity?: number } = {},
  ): Promise<SemanticSearchResult[]> {
    const limit = options.limit || 20;
    const minSimilarity = options.minSimilarity ?? 0.3; // Default 0.3 for better recall

    // 1. Semantic search using vector similarity
    const semanticResults = await this.semanticSearch(
      userId,
      query,
      limit,
      minSimilarity,
    );

    // 2. Keyword search using Gmail API (existing implementation)
    let keywordResults: any[] = [];
    try {
      const gmailResults = await this.gmailSearchService.searchEmails(
        userId,
        query,
        {
          page: 1,
          limit: 10,
        },
      );
      keywordResults = gmailResults.emails || [];
    } catch (error) {
      console.error('Keyword search failed:', error);
    }

    // 3. Merge and deduplicate results
    const mergedResults = this.mergeResults(semanticResults, keywordResults);

    return mergedResults.slice(0, limit);
  }

  /**
   * Pure semantic search using vector similarity
   */
  async semanticSearch(
    userId: string,
    query: string,
    limit: number = 20,
    minSimilarity: number = 0.3,
  ): Promise<SemanticSearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const queryVector = this.embeddingService.vectorToString(queryEmbedding);

    // Vector similarity search using pgvector - use raw query to avoid TypeORM parameter binding issues
    const results = await this.emailContentRepository.query(
      `
      SELECT
        email_id as "email_emailId",
        subject as "email_subject",
        body_preview as "email_bodyPreview",
        "from" as "email_from",
        "to" as "email_to",
        date as "email_date",
        1 - (embedding <=> $1::vector) as similarity
      FROM email_contents
      WHERE user_id = $2
        AND embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT $3
      `,
      [queryVector, userId, limit],
    );

    const filtered = results.filter((r) => r.similarity >= minSimilarity);

    return filtered.map((r) => ({
        emailId: r.email_emailId,
        subject: r.email_subject,
        bodyPreview: r.email_bodyPreview,
        from: r.email_from,
        to: r.email_to,
        date: r.email_date,
        similarity: parseFloat(r.similarity),
        source: 'semantic' as const,
      }));
  }

  /**
   * Merge semantic and keyword search results
   */
  private mergeResults(
    semanticResults: SemanticSearchResult[],
    keywordResults: any[],
  ): SemanticSearchResult[] {
    const merged = new Map<string, SemanticSearchResult>();

    // Add semantic results
    semanticResults.forEach((result) => {
      merged.set(result.emailId, result);
    });

    // Add keyword results (lower priority if duplicate)
    keywordResults.forEach((email) => {
      if (merged.has(email.id)) {
        // Mark as found by both
        const existing = merged.get(email.id)!;
        existing.source = 'both';
      } else {
        // Add as keyword-only result
        merged.set(email.id, {
          emailId: email.id,
          subject: email.subject,
          bodyPreview: email.preview,
          from: email.from,
          to: email.to,
          date: email.date,
          similarity: 0, // No semantic similarity
          source: 'keyword',
        });
      }
    });

    // Sort: both > semantic > keyword
    return Array.from(merged.values()).sort((a, b) => {
      const sourceScore = { both: 3, semantic: 2, keyword: 1 };
      const scoreDiff = sourceScore[b.source] - sourceScore[a.source];
      if (scoreDiff !== 0) return scoreDiff;
      return b.similarity - a.similarity;
    });
  }
}
