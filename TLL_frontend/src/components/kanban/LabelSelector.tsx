import { useState, useMemo } from "react";
import { Check, Search, Tag, AlertCircle, Loader2 } from "lucide-react";
import type { GmailLabel } from "../../types/kanban-config.types";

interface LabelSelectorProps {
  labels: GmailLabel[];
  selectedLabelId: string | null;
  selectedLabelName: string | null;
  onSelect: (labelId: string | null, labelName: string | null) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function LabelSelector({
  labels,
  selectedLabelId,
  selectedLabelName,
  onSelect,
  isLoading = false,
  error = null,
}: LabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and group labels
  const { userLabels, systemLabels } = useMemo(() => {
    const filtered = labels.filter((label) =>
      label.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      userLabels: filtered.filter((label) => label.type === "user"),
      systemLabels: filtered.filter((label) => label.type === "system"),
    };
  }, [labels, searchQuery]);

  const handleSelect = (labelId: string | null, labelName: string | null) => {
    onSelect(labelId, labelName);
    setIsOpen(false);
    setSearchQuery("");
  };

  const displayText = selectedLabelName || "No label (status-only workflow)";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-slate-500" />
        <span className="text-sm text-gray-500 dark:text-slate-400">Loading labels...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-red-300 dark:border-red-800/50 rounded-lg bg-red-50 dark:bg-red-900/20">
        <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
        <span className="text-sm text-red-600 dark:text-red-300">{error}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:border-gray-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={`text-sm truncate ${selectedLabelId ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
            {displayText}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search labels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-60">
              {/* No Label Option */}
              <button
                type="button"
                onClick={() => handleSelect(null, null)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-slate-600" />
                  <span className="text-gray-700 dark:text-slate-200">No label</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">(status-only)</span>
                </div>
                {selectedLabelId === null && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>

              {/* Divider */}
              {(userLabels.length > 0 || systemLabels.length > 0) && (
                <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
              )}

              {/* User Labels */}
              {userLabels.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                    Your Labels
                  </div>
                  {userLabels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => handleSelect(label.id, label.name)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: label.color?.backgroundColor || '#CBD5E0',
                          }}
                        />
                        <span className="text-gray-900 dark:text-slate-200">{label.name}</span>
                      </div>
                      {selectedLabelId === label.id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* System Labels */}
              {systemLabels.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                    System Labels
                  </div>
                  {systemLabels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => handleSelect(label.id, label.name)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: label.color?.backgroundColor || '#CBD5E0',
                          }}
                        />
                        <span className="text-gray-900 dark:text-slate-200">{label.name}</span>
                      </div>
                      {selectedLabelId === label.id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Empty State */}
              {userLabels.length === 0 && systemLabels.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  {searchQuery ? 'No labels found' : 'No labels available'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
