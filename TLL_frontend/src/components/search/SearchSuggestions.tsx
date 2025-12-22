import type { ReactNode } from "react";
import { User, FileText } from "lucide-react";
import type { Suggestion } from "../../hooks/useSuggestions";

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onClose: () => void;
  isVisible: boolean;
  query: string;
}

export function SearchSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
  isVisible,
  query,
}: SearchSuggestionsProps) {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
        <div className="py-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => {
                // Optional: could update selected index on hover
              }}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                index === selectedIndex ? "bg-blue-50" : ""
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
              <span className="text-sm text-gray-900 flex-1 truncate">
                {highlightMatch(suggestion.text, query)}
              </span>

              {/* Type badge */}
              <span className="text-xs text-gray-500 capitalize flex-shrink-0">
                {suggestion.type}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
          <p className="text-xs text-gray-500">
            Use ↑↓ to navigate, Enter to search
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Highlights the matched portion of the text
 */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <strong className="font-semibold text-blue-600">
        {text.slice(index, index + query.length)}
      </strong>
      {text.slice(index + query.length)}
    </>
  );
}
