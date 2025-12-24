import { useState, useRef, useEffect, forwardRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { SearchSuggestions } from "./SearchSuggestions";
import type { Suggestion } from "../../hooks/useSuggestions";
import type { SearchHistoryItem } from "../../hooks/useSearchHistory";
import { SEARCH_CONFIG } from "../../constants/search.constants";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  suggestions?: Suggestion[];
  showSuggestions?: boolean;
  onSuggestionSelect?: (suggestion: Suggestion) => void;
  className?: string;
  // New props for enhancements
  isLoading?: boolean;
  recentSearches?: SearchHistoryItem[];
  onSearchHistoryAdd?: (query: string) => void;
  onDeleteHistory?: (id: string) => void;
  onClearAllHistory?: () => void;
  showEmptyState?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(({
  query,
  onQueryChange,
  onSearch,
  onClear,
  suggestions = [],
  showSuggestions = true,
  onSuggestionSelect,
  className = "",
  isLoading = false,
  recentSearches = [],
  onSearchHistoryAdd,
  onDeleteHistory,
  onClearAllHistory,
  showEmptyState = false,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose ref to parent component
  useEffect(() => {
    if (ref && inputRef.current) {
      if (typeof ref === 'function') {
        ref(inputRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
      }
    }
  }, [ref]);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Calculate total suggestions count (history + regular suggestions)
  const totalSuggestions = recentSearches.length + suggestions.length;

  // Get the ID of the currently selected suggestion for aria-activedescendant
  const getActiveSuggestionId = (): string | undefined => {
    if (selectedIndex < 0) return undefined;

    if (selectedIndex < recentSearches.length) {
      // Selected item is from history
      return `history-${recentSearches[selectedIndex].id}`;
    } else {
      // Selected item is from regular suggestions
      const suggestionIdx = selectedIndex - recentSearches.length;
      return `suggestion-${suggestionIdx}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only handle navigation if suggestions are visible
    if (!showSuggestions || !isFocused || totalSuggestions === 0) {
      // Still handle Enter for regular search
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalSuggestions - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < totalSuggestions) {
          // Handle selection from history or suggestions
          if (selectedIndex < recentSearches.length) {
            const historyItem = recentSearches[selectedIndex];
            handleHistorySelect(historyItem.query);
          } else {
            const suggestionIdx = selectedIndex - recentSearches.length;
            handleSuggestionSelect(suggestions[suggestionIdx]);
          }
        } else {
          handleSearchSubmit(query);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsFocused(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSearchSubmit = (searchQuery: string) => {
    onSearch(searchQuery);
    // Add to search history if query is valid
    if (searchQuery.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      onSearchHistoryAdd?.(searchQuery);
    }
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    onQueryChange(suggestion.text);
    onSearch(suggestion.text);
    setIsFocused(false);
    setSelectedIndex(-1);

    // Add to search history
    onSearchHistoryAdd?.(suggestion.text);

    // Notify parent if callback provided
    onSuggestionSelect?.(suggestion);
  };

  const handleHistorySelect = (historyQuery: string) => {
    onQueryChange(historyQuery);
    onSearch(historyQuery);
    setIsFocused(false);
    setSelectedIndex(-1);

    // Re-add to history (will move to top)
    onSearchHistoryAdd?.(historyQuery);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    // Clear any existing timeout to prevent multiple timeouts
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    // Delay to allow click/mousedown on suggestion to register
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
      setSelectedIndex(-1);
    }, SEARCH_CONFIG.BLUR_DELAY);
  };

  const handleClear = () => {
    onClear();
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search mail (min. 2 characters)... (Ctrl + F to focus)"
          className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          aria-label="Search emails"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={isFocused && totalSuggestions > 0}
          aria-activedescendant={getActiveSuggestionId()}
          role="combobox"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          </div>
        )}

        {/* Clear Button */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear search (ESC)"
            aria-label="Clear search"
          >
            <div style={{ display: "inline-flex" }}>
              <X className="w-5 h-5 pt-1" />
              <span className="text-[10px] font-bold px-1 py-1 bg-white shadow-sm">
                ( ESC )
              </span>
            </div>
          </button>
        )}
      </div>

      {showSuggestions && (
        <SearchSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSuggestionSelect}
          onClose={() => {
            setIsFocused(false);
            setSelectedIndex(-1);
          }}
          isVisible={isFocused && (query.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH || recentSearches.length > 0)}
          query={query}
          recentSearches={recentSearches}
          onHistorySelect={handleHistorySelect}
          onDeleteHistory={onDeleteHistory}
          onClearAllHistory={onClearAllHistory}
          showEmptyState={showEmptyState}
        />
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
