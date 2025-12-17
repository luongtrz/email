import { Injectable } from '@nestjs/common';
const Fuse = require('fuse.js');
import { MailRepository } from '../repositories/mail.repository';
import { normalizeText } from '../utils/text-normalizer.util';
import { GmailApiService } from './gmail-api.service';
import { GmailParserService } from './gmail-parser.service';

export interface SearchResult {
  id: string;
  gmailMessageId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: Date;
  score?: number;
}

@Injectable()
export class FuzzySearchService {
  constructor(
    private mailRepository: MailRepository,
    private gmailApiService: GmailApiService,
    private gmailParserService: GmailParserService,
  ) {}

  async searchEmails(userId: string, query: string): Promise<SearchResult[]> {
    try {
      // Normalize the search query
      const normalizedQuery = normalizeText(query);

      // Fetch all emails from database (for Fuse.js training only)
      const allEmails = await this.mailRepository.findAllEmailsByUserId(userId);

      if (allEmails.length === 0) {
        return [];
      }

      // Configure Fuse.js for fuzzy search
      const fuse = new Fuse(allEmails, {
        keys: [
          { name: 'fromNormalized', weight: 0.6 },
          { name: 'subjectNormalized', weight: 0.4 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        includeScore: true,
        useExtendedSearch: false,
        minMatchCharLength: 1,
      });

      // Perform fuzzy search to get matching results
      const fuseResults = fuse.search(normalizedQuery);

      if (fuseResults.length === 0) {
        return [];
      }

      // Get top 5 most accurate matches for search
      const topMatches = fuseResults.slice(0, 5);

      // Build Gmail search queries using matched from/subject
      const searchQueries = topMatches.map((result) => {
        const parts: string[] = [];
        
        if (result.item.from) {
          // Extract email from "Name <email@example.com>" format
          const emailMatch = result.item.from.match(/<(.+?)>/) || 
                           result.item.from.match(/([^\s]+@[^\s]+)/);
          const email = emailMatch ? emailMatch[1] || emailMatch[0] : result.item.from;
          parts.push(`from:${email}`);
        }
        
        if (result.item.subject) {
          // Use subject in quotes for exact phrase matching
          parts.push(`subject:"${result.item.subject}"`);
        }

        return {
          query: parts.join(' '),
          score: result.score,
        };
      });

      // Search Gmail API with each query and collect results
      const allResults: SearchResult[] = [];
      const seenIds = new Set<string>();

      for (const { query: gmailQuery, score } of searchQueries) {
        if (allResults.length >= 20) break;

        if (!gmailQuery) continue;

        const searchResult = await this.gmailApiService.searchMessages(
          userId,
          gmailQuery,
          5, // Max 5 results per query
        );

        if (searchResult.messages && searchResult.messages.length > 0) {
          const messageIds = searchResult.messages
            .map((msg) => msg.id || '')
            .filter(Boolean);

          // Fetch full message details
          const gmailMessages = await this.gmailApiService.getMessages(
            userId,
            messageIds,
          );

          // Parse and add to results (avoid duplicates)
          for (const msg of gmailMessages) {
            const email = this.gmailParserService.parseMessage(msg);
            
            if (!seenIds.has(email.id)) {
              seenIds.add(email.id);
              
              const fromEmail =
                email.from?.email || email.from?.toString() || 'unknown';

              allResults.push({
                id: email.id,
                gmailMessageId: email.id,
                from: fromEmail,
                subject: email.subject || '',
                snippet: email.snippet || '',
                receivedAt: email.date,
                score,
              });
            }
          }
        }
      }

      // Return top 20 unique results
      return allResults.slice(0, 20);
    } catch (error) {
      console.error('Error performing fuzzy search:', error);
      return [];
    }
  }
}

