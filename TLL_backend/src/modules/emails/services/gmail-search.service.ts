import { Injectable, BadRequestException } from '@nestjs/common';
import { GmailApiService } from './gmail-api.service';
import { GmailParserService } from './gmail-parser.service';

/**
 * GmailSearchService - Implements pseudo-fuzzy search on Gmail API
 *
 * IMPORTANT LIMITATIONS:
 * - Gmail API does NOT support true fuzzy search or custom relevance scoring
 * - This service simulates fuzzy behavior through query expansion and normalization
 * - Results are ordered by Gmail's default ordering (newest first)
 * - Typo tolerance is simulated, not true edit-distance matching
 *
 * APPROACH:
 * 1. Normalize query (lowercase, trim, remove accents)
 * 2. Expand query into multiple Gmail search operators
 * 3. Generate typo-tolerant variations
 * 4. Fallback to general search if specific operators return no results
 */
@Injectable()
export class GmailSearchService {
  constructor(
    private gmailApiService: GmailApiService,
    private gmailParserService: GmailParserService,
  ) {}

  /**
   * Search emails with pseudo-fuzzy behavior
   *
   * @param userId - User ID
   * @param query - Search query from user
   * @param options - Pagination options
   * @returns Paginated search results
   */
  async searchEmails(
    userId: string,
    query: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 20 } = options;

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    // Step 1: Normalize the query
    const normalizedQuery = this.normalizeQuery(query);

    // Step 2: Build Gmail search query with expansion
    const gmailQuery = this.buildGmailQuery(normalizedQuery);

    // Step 3: Execute search with pagination
    const maxResults = limit * page;

    try {
      const result = await this.gmailApiService.searchMessages(
        userId,
        gmailQuery,
        maxResults,
      );

      const messageIds = (result.messages || [])
        .map((msg) => msg.id || '')
        .filter(Boolean);

      if (messageIds.length === 0) {
        // Try fallback: general keyword search without operators
        const fallbackQuery = normalizedQuery;
        const fallbackResult = await this.gmailApiService.searchMessages(
          userId,
          fallbackQuery,
          maxResults,
        );

        const fallbackMessageIds = (fallbackResult.messages || [])
          .map((msg) => msg.id || '')
          .filter(Boolean);

        if (fallbackMessageIds.length === 0) {
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

        return this.fetchAndPaginateResults(
          userId,
          fallbackMessageIds,
          page,
          limit,
          fallbackResult.resultSizeEstimate || 0,
        );
      }

      return this.fetchAndPaginateResults(
        userId,
        messageIds,
        page,
        limit,
        result.resultSizeEstimate || 0,
      );
    } catch (error) {
      // Gmail API error handling
      if (error.code === 429) {
        throw new BadRequestException(
          'Gmail API rate limit exceeded. Please try again later.',
        );
      }
      throw error;
    }
  }

  /**
   * Normalize query string
   * - Convert to lowercase
   * - Trim whitespace
   * - Remove accents/diacritics
   *
   * @param query - Raw query string
   * @returns Normalized query
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  }

  /**
   * Build Gmail search query with pseudo-fuzzy expansion
   *
   * STRATEGY:
   * - Use Gmail search operators: from:, subject:
   * - Expand query to search multiple fields
   * - Generate typo-tolerant variations
   *
   * EXAMPLE:
   * Input: "Nguy"
   * Output: "from:nguy OR from:nguyen OR subject:nguy OR subject:nguyen"
   *
   * @param normalizedQuery - Normalized query string
   * @returns Gmail API query string
   */
  private buildGmailQuery(normalizedQuery: string): string {
    const queries: string[] = [];

    // 1. Search in sender (from: operator)
    queries.push(`from:${normalizedQuery}`);

    // 2. Search in subject (subject: operator)
    queries.push(`subject:${normalizedQuery}`);

    // 3. Generate typo-tolerant variations
    const variations = this.generateTypoVariations(normalizedQuery);
    variations.forEach((variation) => {
      queries.push(`from:${variation}`);
      queries.push(`subject:${variation}`);
    });

    // Combine all queries with OR operator
    return queries.join(' OR ');
  }

  /**
   * Generate typo-tolerant query variations
   *
   * SIMULATION STRATEGY:
   * - Common name expansions (e.g., "Nguy" -> "Nguyen")
   * - Partial word matching (handled by Gmail's partial matching)
   *
   * LIMITATIONS:
   * - Does NOT implement true edit distance (Levenshtein distance)
   * - Does NOT handle complex typos (transpositions, substitutions)
   * - Relies on Gmail's built-in partial matching
   *
   * @param query - Normalized query
   * @returns Array of query variations
   */
  private generateTypoVariations(query: string): string[] {
    const variations: string[] = [];

    // Common name expansions
    const nameExpansions: Record<string, string[]> = {
      nguy: ['nguyen'],
      alex: ['alexander', 'alexandra'],
      mike: ['michael'],
      rob: ['robert'],
      // Add more common expansions as needed
    };

    const lowerQuery = query.toLowerCase();
    if (nameExpansions[lowerQuery]) {
      variations.push(...nameExpansions[lowerQuery]);
    }

    return variations;
  }

  /**
   * Fetch full message details and paginate results
   *
   * @param userId - User ID
   * @param messageIds - Array of message IDs
   * @param page - Page number
   * @param limit - Results per page
   * @param totalEstimate - Total result count estimate from Gmail
   * @returns Paginated email results
   */
  private async fetchAndPaginateResults(
    userId: string,
    messageIds: string[],
    page: number,
    limit: number,
    totalEstimate: number,
  ) {
    // Paginate message IDs first (in-memory pagination)
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedIds = messageIds.slice(start, end);

    if (paginatedIds.length === 0) {
      return {
        emails: [],
        pagination: {
          total: totalEstimate,
          page,
          limit,
          totalPages: Math.ceil(totalEstimate / limit),
        },
      };
    }

    // Fetch full message details for paginated IDs
    const messages = await this.gmailApiService.getMessages(
      userId,
      paginatedIds,
    );

    // Parse messages into lightweight DTOs
    const emails = messages.map((msg) => {
      const parsed = this.gmailParserService.parseMessage(msg);
      return {
        id: parsed.id,
        sender: `${parsed.from.name} <${parsed.from.email}>`,
        subject: parsed.subject,
        snippet: parsed.preview,
        date: parsed.date,
      };
    });

    // Sort by date descending (newest first - Gmail default)
    emails.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      emails,
      pagination: {
        total: totalEstimate,
        page,
        limit,
        totalPages: Math.ceil(totalEstimate / limit),
      },
    };
  }
}
