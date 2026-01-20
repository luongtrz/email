import type { ReactNode } from "react";
import { User, FileText, History, X, Search as SearchIcon } from "lucide-react";
import type { Suggestion } from "../../hooks/useSuggestions";
import type { SearchHistoryItem } from "../../hooks/useSearchHistory";
import { escapeRegExp } from "../../utils/string.utils";

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onClose: () => void;
  isVisible: boolean;
  query: string;
  // New props for enhancements
  recentSearches?: SearchHistoryItem[];
  onHistorySelect?: (query: string) => void;
  onDeleteHistory?: (id: string) => void;
  onClearAllHistory?: () => void;
  showEmptyState?: boolean;
}

export function SearchSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
  isVisible,
  query,
  recentSearches = [],
  onHistorySelect,
  onDeleteHistory,
  onClearAllHistory,
  showEmptyState = false,
}: SearchSuggestionsProps) {
  // Don't show dropdown if not visible
  if (!isVisible) return null;

  // Show empty state if no suggestions and no history
  if (showEmptyState && suggestions.length === 0 && recentSearches.length === 0) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-10" onClick={onClose} />

        {/* Empty State Dropdown */}
        <div
          className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
          id="search-suggestions"
        >
          <div className="py-8 px-4 text-center">
            <SearchIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">No suggestions found</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try a different search term</p>
          </div>
        </div>
      </>
    );
  }

  // Don't show dropdown if no content at all
  if (suggestions.length === 0 && recentSearches.length === 0) {
    return null;
  }

  const hasHistory = recentSearches.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* Dropdown */}
      <div
        className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        role="listbox"
        id="search-suggestions"
      >
        {/* Recent Searches Section */}
        {hasHistory && (
          <div className="border-b border-gray-100 dark:border-slate-700">
            <div className="px-3 py-2 bg-gray-50 dark:bg-slate-700/50">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Recent Searches
              </p>
            </div>
            <div className="py-1">
              {recentSearches.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    id={`history-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onHistorySelect?.(item.query);
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors group ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                      }`}
                    type="button"
                  >
                    <History className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-slate-200 flex-1 truncate">
                      {item.query}
                    </span>
                    {/* Delete button - using span to avoid nested button */}
                    <span
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDeleteHistory?.(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-opacity cursor-pointer"
                      title="Remove from history"
                      aria-label={`Remove "${item.query}" from history`}
                      role="button"
                      tabIndex={0}
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Clear All History Button */}
            {onClearAllHistory && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onClearAllHistory();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  type="button"
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        )}

        {/* Regular Suggestions Section */}
        {hasSuggestions && (
          <div className="py-1">
            {suggestions.map((suggestion, index) => {
              // Adjust selected index to account for history items
              const adjustedIndex = index + recentSearches.length;
              const isSelected = adjustedIndex === selectedIndex;

              return (
                <button
                  key={suggestion.id}
                  id={`suggestion-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(suggestion);
                  }}
                  className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                    }`}
                  type="button"
                >
                  {/* Icon based on type */}
                  {suggestion.type === "sender" ? (
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}

                  {/* Suggestion text with query highlight */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {/* Fuzzy match indicator */}
                    {suggestion.matchType === "fuzzy" && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex-shrink-0 pt-[2px]">
                        Did you mean:
                      </span>
                    )}
                    <span className="text-sm text-gray-900 dark:text-slate-200 truncate">
                      {highlightMatch(suggestion.text, query)}
                    </span>
                  </div>

                  {/* Type badge */}
                  <span className="text-xs text-gray-500 dark:text-slate-500 capitalize flex-shrink-0">
                    {suggestion.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-2 bg-gray-50 dark:bg-slate-800">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Use ↑↓ to navigate, Enter to search
          </p>
        </div>

        {/* Live region for screen readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {recentSearches.length + suggestions.length} suggestions available
        </div>
      </div>
    </>
  );
}

/**
 * Highlights the matched portion of the text
 * Uses sanitized query to prevent regex errors
 */
function highlightMatch(text: string, query: string): ReactNode {
  if (!text || !query) return text;

  try {
    // Sanitize query to prevent regex errors
    const sanitizedQuery = escapeRegExp(query.trim());
    const index = text.toLowerCase().indexOf(sanitizedQuery.toLowerCase());

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <strong className="font-semibold text-blue-600 dark:text-blue-400">
          {text.slice(index, index + sanitizedQuery.length)}
        </strong>
        {text.slice(index + sanitizedQuery.length)}
      </>
    );
  } catch (error) {
    console.error('Error highlighting match:', error);
    return text;
  }
}
