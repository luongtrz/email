import React from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { useGenerateSummaryMutation } from "../../hooks/queries/useKanbanQuery";

interface EmailSummaryCardProps {
  emailId: string;
  summary?: string | null;
}

export const EmailSummaryCard: React.FC<EmailSummaryCardProps> = ({
  emailId,
  summary,
}) => {
  const generateMutation = useGenerateSummaryMutation();

  const handleGenerate = () => {
    generateMutation.mutate({ emailId });
  };

  // Get summary from either prop or mutation result
  const displaySummary = summary || generateMutation.data?.summary;

  return (
    <div className="space-y-4">
      {/* Generate Summary Button - Always visible */}
      <div className="flex items-center justify-center py-2">
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="w-full relative group overflow-hidden flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 -translate-x-full" />
          <Sparkles className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium tracking-wide">
            {generateMutation.isPending ? 'Analyzing...' : displaySummary ? 'Regenerate Summary' : 'Generate Summary'}
          </span>
        </button>
      </div>

      {/* Loading state */}
      {generateMutation.isPending && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 justify-center">
            <div className="relative">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              <div className="absolute inset-0 bg-purple-400 blur-lg opacity-50 animate-pulse"></div>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              AI is analyzing this email...
            </p>
          </div>
          {/* Skeleton loader */}
          <div className="space-y-2">
            <div className="h-3 bg-gradient-to-r from-purple-200 via-purple-100 to-purple-200 rounded animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-3 bg-gradient-to-r from-purple-200 via-purple-100 to-purple-200 rounded animate-shimmer bg-[length:200%_100%]" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-3 bg-gradient-to-r from-purple-200 via-purple-100 to-purple-200 rounded animate-shimmer bg-[length:200%_100%] w-3/4" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Error state */}
      {generateMutation.isError && (
        <div className="bg-red-50 rounded-lg p-4 border border-red-200 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Failed to generate summary. Please try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Display summary if available */}
      {displaySummary && !generateMutation.isPending && (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-purple-200 dark:border-slate-700 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-gray-600 dark:text-slate-400">AI Summary</span>
          </div>

          {/* Render HTML summary with custom styling */}
          <div
            className="ai-summary-content text-sm text-gray-700 dark:text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: displaySummary }}
            style={{
              // Custom styles for AI-generated HTML
              wordWrap: 'break-word',
            }}
          />

          <div className="mt-3 pt-3 border-t border-purple-100 dark:border-slate-600/50">
            <p className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-500" />
              Powered by Google Gemini
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
