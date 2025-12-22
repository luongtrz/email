import { useMemo } from "react";
import type { Email } from "../types/email.types";

export interface Suggestion {
  id: string;
  type: "sender" | "subject";
  text: string;
  matchType: "prefix" | "substring";
  email?: Email; // Reference for context
}

const COMMON_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "with",
  "this",
  "that",
  "from",
  "have",
  "your",
  "about",
  "will",
  "been",
  "was",
  "were",
  "but",
  "not",
  "you",
  "all",
  "can",
  "her",
  "his",
  "our",
  "they",
  "them",
]);

/**
 * Hook to generate search suggestions from emails
 * @param emails - List of emails to extract suggestions from
 * @param query - Current search query
 * @param maxSuggestions - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggestions sorted by relevance
 */
export function useSuggestions(
  emails: Email[],
  query: string,
  maxSuggestions = 5
): Suggestion[] {
  return useMemo(() => {
    // Don't show suggestions for very short queries
    if (!query || query.length < 2) return [];

    const suggestions: Suggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // 1. Extract unique senders with most recent email
    const senders = new Map<string, Email>();
    emails.forEach((email) => {
      const key = email.from.email.toLowerCase();
      if (
        !senders.has(key) ||
        new Date(email.date) > new Date(senders.get(key)!.date)
      ) {
        senders.set(key, email);
      }
    });

    // 2. Match senders against query
    senders.forEach((email, senderEmail) => {
      const senderName = email.from.name?.toLowerCase() || "";
      const senderAddr = senderEmail.toLowerCase();

      // Prefix match on name (highest priority)
      if (senderName.startsWith(lowerQuery)) {
        suggestions.push({
          id: `sender-${senderEmail}`,
          type: "sender",
          text: email.from.name || senderEmail,
          matchType: "prefix",
          email,
        });
      }
      // Substring match on name or email
      else if (
        senderName.includes(lowerQuery) ||
        senderAddr.includes(lowerQuery)
      ) {
        suggestions.push({
          id: `sender-${senderEmail}`,
          type: "sender",
          text: email.from.name || senderEmail,
          matchType: "substring",
          email,
        });
      }
    });

    // 3. Extract and match subject keywords
    const keywords = new Set<string>();
    emails.forEach((email) => {
      const words = email.subject
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !COMMON_WORDS.has(w));
      words.forEach((w) => keywords.add(w));
    });

    keywords.forEach((keyword) => {
      // Prefix match on keyword
      if (keyword.startsWith(lowerQuery)) {
        suggestions.push({
          id: `subject-${keyword}`,
          type: "subject",
          text: keyword,
          matchType: "prefix",
        });
      }
      // Substring match on keyword
      else if (keyword.includes(lowerQuery)) {
        suggestions.push({
          id: `subject-${keyword}`,
          type: "subject",
          text: keyword,
          matchType: "substring",
        });
      }
    });

    // 4. Sort and limit
    return suggestions
      .sort((a, b) => {
        // Prefix matches before substring matches
        if (a.matchType !== b.matchType) {
          return a.matchType === "prefix" ? -1 : 1;
        }
        // Senders before subject keywords
        if (a.type !== b.type) {
          return a.type === "sender" ? -1 : 1;
        }
        // Alphabetical within same type and match
        return a.text.localeCompare(b.text);
      })
      .slice(0, maxSuggestions);
  }, [emails, query, maxSuggestions]);
}
