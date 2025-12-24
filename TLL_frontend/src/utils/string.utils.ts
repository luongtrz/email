/**
 * String utility functions
 * 
 * Common string manipulation and sanitization utilities
 */

/**
 * Escapes special regex characters in a string
 * 
 * Prevents regex syntax errors when user input contains special characters
 * like [, ], (, ), *, +, ?, ^, $, {, }, |, \
 * 
 * @param str - String to escape
 * @returns Escaped string safe for use in regex
 * 
 * @example
 * escapeRegExp('test[123]') // Returns 'test\\[123\\]'
 * escapeRegExp('query(*)') // Returns 'query\\(\\*\\)'
 */
export function escapeRegExp(str: string): string {
    if (!str) return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely converts string to lowercase
 * 
 * @param str - String to convert
 * @returns Lowercase string or empty string if input is null/undefined
 */
export function safeLowerCase(str: string | null | undefined): string {
    return str?.toLowerCase() || '';
}

/**
 * Truncates a string to a maximum length with ellipsis
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(str: string, maxLength: number): string {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}
