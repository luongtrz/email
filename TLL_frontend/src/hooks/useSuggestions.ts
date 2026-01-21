import { useMemo } from "react";
import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import type { Email } from "../types/email.types";
import { SEARCH_CONFIG } from "../constants/search.constants";

export interface Suggestion {
  id: string;
  type: "sender" | "subject";
  text: string;
  matchType: "prefix" | "substring" | "fuzzy";
  score?: number; // Fuse.js score (lower is better)
  email?: Email; // Reference for context
}

const COMMON_WORDS = new Set([
  "the", "and", "for", "are", "with", "this", "that", "from",
  "have", "your", "about", "will", "been", "was", "were", "but",
  "not", "you", "all", "can", "her", "his", "our", "they", "them",
]);

// Fuse.js configuration for optimal fuzzy search
const FUSE_OPTIONS: IFuseOptions<any> = {
  includeScore: true,
  threshold: 0.35, // 0 = perfect match, 1 = match anything
  distance: 100, // Maximum distance for fuzzy matching
  minMatchCharLength: 2,
  ignoreLocation: true, // Search entire string, not just beginning
  keys: [
    { name: "text", weight: 1 },
  ],
};

/**
 * Hook to generate search suggestions from emails using Fuse.js for fuzzy matching
 * @param emails - List of emails to extract suggestions from
 * @param query - Current search query
 * @param maxSuggestions - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggestions sorted by relevance
 */
export function useSuggestions(
  emails: Email[],
  query: string,
  maxSuggestions = SEARCH_CONFIG.MAX_SUGGESTIONS
): Suggestion[] {
  return useMemo(() => {
    // Don't show suggestions for very short queries
    if (!query || query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return [];

    const trimmedQuery = query.trim().toLowerCase();

    // Step 1: Extract unique senders
    const senderSuggestions: Suggestion[] = [];
    const seenSenders = new Set<string>();

    const senderMap = new Map<string, Email>();
    emails.forEach((email) => {
      const key = email.from?.email?.toLowerCase() || '';
      if (
        !senderMap.has(key) ||
        new Date(email.date) > new Date(senderMap.get(key)!.date)
      ) {
        senderMap.set(key, email);
      }
    });

    senderMap.forEach((email, senderEmail) => {
      const senderName = email.from?.name || senderEmail || 'Unknown';
      const senderNameLower = senderName.toLowerCase();
      const senderEmailLower = senderEmail.toLowerCase();

      // Skip duplicates
      if (seenSenders.has(senderNameLower)) return;

      // Check if sender matches query
      if (
        senderNameLower.includes(trimmedQuery) ||
        senderEmailLower.includes(trimmedQuery)
      ) {
        // Determine match type for sorting
        let matchType: "prefix" | "substring" | "fuzzy" = "substring";
        if (senderNameLower.startsWith(trimmedQuery)) {
          matchType = "prefix";
        }

        senderSuggestions.push({
          id: `sender-${senderEmail}`,
          type: "sender",
          text: senderName,
          matchType,
          email,
        });
        seenSenders.add(senderNameLower);
      }
    });

    // Step 2: Extract subject keywords
    const keywordSuggestions: Suggestion[] = [];
    const seenKeywords = new Set<string>();

    const keywords = new Set<string>();
    emails.forEach((email) => {
      const words = email.subject
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !COMMON_WORDS.has(w));
      words.forEach((w) => keywords.add(w));
    });

    keywords.forEach((keyword) => {
      if (seenKeywords.has(keyword)) return;

      if (keyword.includes(trimmedQuery)) {
        let matchType: "prefix" | "substring" | "fuzzy" = "substring";
        if (keyword.startsWith(trimmedQuery)) {
          matchType = "prefix";
        }

        keywordSuggestions.push({
          id: `subject-${keyword}`,
          type: "subject",
          text: keyword,
          matchType,
        });
        seenKeywords.add(keyword);
      }
    });

    // Step 3: Combine and prepare for Fuse.js fuzzy search
    const exactMatches = [...senderSuggestions, ...keywordSuggestions];

    // Step 4: Apply Fuse.js for fuzzy matching on items that didn't exact match
    const allCandidates: Array<{ text: string; type: "sender" | "subject"; email?: Email }> = [];

    // Add senders that weren't exact matched
    senderMap.forEach((email, senderEmail) => {
      const senderName = email.from?.name || senderEmail || 'Unknown';
      if (!seenSenders.has(senderName.toLowerCase())) {
        allCandidates.push({
          text: senderName,
          type: "sender",
          email,
        });
      }
    });

    // Add keywords that weren't exact matched
    keywords.forEach((keyword) => {
      if (!seenKeywords.has(keyword)) {
        allCandidates.push({
          text: keyword,
          type: "subject",
        });
      }
    });

    // Run Fuse.js fuzzy search on remaining candidates
    const fuse = new Fuse(allCandidates, FUSE_OPTIONS);
    const fuzzyResults = fuse.search(trimmedQuery);

    const fuzzySuggestions: Suggestion[] = fuzzyResults
      .slice(0, maxSuggestions) // Limit fuzzy results
      .map((result) => ({
        id: `${result.item.type}-${result.item.text}`,
        type: result.item.type,
        text: result.item.text,
        matchType: "fuzzy" as const,
        score: result.score,
        email: result.item.email,
      }));

    // Step 5: Combine exact matches + fuzzy matches
    const allSuggestions = [...exactMatches, ...fuzzySuggestions];

    // Step 6: Deduplicate by text (case-insensitive)
    const uniqueSuggestions = new Map<string, Suggestion>();
    allSuggestions.forEach((suggestion) => {
      const key = suggestion.text.toLowerCase();
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, suggestion);
      }
    });

    // Step 7: Sort by relevance
    return Array.from(uniqueSuggestions.values())
      .sort((a, b) => {
        // 1. Prefix matches first
        if (a.matchType === "prefix" && b.matchType !== "prefix") return -1;
        if (a.matchType !== "prefix" && b.matchType === "prefix") return 1;

        // 2. Substring matches before fuzzy
        if (a.matchType === "substring" && b.matchType === "fuzzy") return -1;
        if (a.matchType === "fuzzy" && b.matchType === "substring") return 1;

        // 3. For fuzzy matches, sort by score (lower is better)
        if (a.matchType === "fuzzy" && b.matchType === "fuzzy") {
          return (a.score || 0) - (b.score || 0);
        }

        // 4. Senders before subjects
        if (a.type !== b.type) {
          return a.type === "sender" ? -1 : 1;
        }

        // 5. Alphabetical
        return a.text.localeCompare(b.text);
      })
      .slice(0, maxSuggestions);
  }, [emails, query, maxSuggestions]);
}
