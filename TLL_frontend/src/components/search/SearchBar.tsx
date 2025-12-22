import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { SearchSuggestions } from "./SearchSuggestions";
import type { Suggestion } from "../../hooks/useSuggestions";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  suggestions?: Suggestion[];
  showSuggestions?: boolean;
  onSuggestionSelect?: (suggestion: Suggestion) => void;
  className?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  onClear,
  suggestions = [],
  showSuggestions = true,
  onSuggestionSelect,
  className = "",
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only handle navigation if suggestions are visible
    if (!showSuggestions || !isFocused || suggestions.length === 0) {
      // Still handle Enter for regular search
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else {
          onSearch(query);
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

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    onQueryChange(suggestion.text);
    onSearch(suggestion.text);
    setIsFocused(false);
    setSelectedIndex(-1);

    // Notify parent if callback provided
    onSuggestionSelect?.(suggestion);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion to register
    setTimeout(() => {
      setIsFocused(false);
      setSelectedIndex(-1);
    }, 200);
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
          placeholder="Search mail (min. 2 characters)..."
          className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          aria-label="Search emails"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={isFocused && suggestions.length > 0}
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
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
          isVisible={isFocused && query.length >= 2}
          query={query}
        />
      )}
    </div>
  );
}
