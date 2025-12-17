/**
 * Normalize text for fuzzy search
 * - Convert to lowercase
 * - Remove accents and diacritics
 * - Trim whitespace
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}
