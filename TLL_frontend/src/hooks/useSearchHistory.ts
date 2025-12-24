import { useState, useEffect, useCallback } from 'react';
import { SEARCH_CONFIG } from '../constants/search.constants';

/**
 * Search history item interface
 */
export interface SearchHistoryItem {
    id: string;
    query: string;
    timestamp: number;
}

/**
 * Custom hook to manage search history with localStorage persistence
 * 
 * Features:
 * - Stores up to MAX_HISTORY recent searches
 * - Persists to localStorage
 * - Moves duplicates to top when re-searched
 * - Provides add, delete, and clear all functions
 * 
 * @returns Search history state and management functions
 */
export function useSearchHistory() {
    const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SEARCH_CONFIG.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as SearchHistoryItem[];
                // Validate structure
                if (Array.isArray(parsed)) {
                    setRecentSearches(parsed);
                }
            }
        } catch (error) {
            console.error('Failed to load search history from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(SEARCH_CONFIG.STORAGE_KEY);
        }
    }, []);

    // Save to localStorage whenever history changes
    useEffect(() => {
        try {
            localStorage.setItem(
                SEARCH_CONFIG.STORAGE_KEY,
                JSON.stringify(recentSearches)
            );
        } catch (error) {
            console.error('Failed to save search history to localStorage:', error);
        }
    }, [recentSearches]);

    /**
     * Add a new search query to history
     * - Removes duplicates (case-insensitive)
     * - Adds to top of list
     * - Limits to MAX_HISTORY items
     */
    const addSearch = useCallback((query: string) => {
        // Trim and validate
        const trimmedQuery = query.trim();
        if (!trimmedQuery || trimmedQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
            return;
        }

        setRecentSearches((prev) => {
            // Remove existing entry (case-insensitive)
            const filtered = prev.filter(
                (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
            );

            // Add new entry at the top
            const newItem: SearchHistoryItem = {
                id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                query: trimmedQuery,
                timestamp: Date.now(),
            };

            // Keep only MAX_HISTORY items
            return [newItem, ...filtered].slice(0, SEARCH_CONFIG.MAX_HISTORY);
        });
    }, []);

    /**
     * Delete a specific search history item by ID
     */
    const deleteSearch = useCallback((id: string) => {
        setRecentSearches((prev) => prev.filter((item) => item.id !== id));
    }, []);

    /**
     * Clear all search history
     */
    const clearAll = useCallback(() => {
        setRecentSearches([]);
        try {
            localStorage.removeItem(SEARCH_CONFIG.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear search history from localStorage:', error);
        }
    }, []);

    return {
        recentSearches,
        addSearch,
        deleteSearch,
        clearAll,
    };
}
