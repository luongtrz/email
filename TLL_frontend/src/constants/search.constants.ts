/**
 * Search Auto-Suggestion Configuration Constants
 * 
 * Centralized configuration for search functionality to ensure
 * consistency and easy maintenance.
 */

export const SEARCH_CONFIG = {
    /**
     * Maximum number of recent searches to store in localStorage
     */
    MAX_HISTORY: 5,

    /**
     * Debounce delay in milliseconds before triggering search
     * Balances responsiveness with API call optimization
     */
    DEBOUNCE_TIME: 300,

    /**
     * Delay in milliseconds before closing dropdown on blur
     * Allows time for click events to register
     */
    BLUR_DELAY: 200,

    /**
     * Minimum query length to trigger suggestions
     */
    MIN_QUERY_LENGTH: 2,

    /**
     * Maximum number of suggestions to display
     */
    MAX_SUGGESTIONS: 5,

    /**
     * localStorage key for storing search history
     */
    STORAGE_KEY: 'search_history',
} as const;
