import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp } from "lucide-react";
import { KanbanCard } from "./KanbanCard";
import type {
  KanbanColumn as KanbanColumnType,
  KanbanCard as KanbanCardType,
} from "../../types/kanban.types";
import type { Email } from "../../types/email.types";

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onCardClick: (email: Email) => void;
  onCardStar?: (emailId: string) => void;
  selectedEmailId?: string | null;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  cards,
  onCardClick,
  onCardStar,
  selectedEmailId,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // Reset collapse state when switching to desktop (lg breakpoint)
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardIds = cards.map((card) => card.id);

  return (
    <div
      className={`flex flex-col w-full lg:w-72 lg:flex-shrink-0 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 transition-all`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color || "#6B7280" }}
            />
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{column.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
              {cards.length}
            </span>
            {/* Collapse/Expand Button - Only on mobile/tablet */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isCollapsed ? "Expand column" : "Collapse column"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Column Content - Collapsible on mobile */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={`flex-1 p-2 space-y-2 overflow-y-auto transition-colors ${isOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""
            }`}
        >
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-sm">No emails</p>
            </div>
          ) : (
            <>
              <SortableContext
                items={cardIds}
                strategy={verticalListSortingStrategy}
              >
                {cards.map((card) => (
                  <KanbanCard
                    key={card.id}
                    email={card.email}
                    onClick={onCardClick}
                    onStar={onCardStar}
                    isSelected={selectedEmailId === card.email.id}
                  />
                ))}
              </SortableContext>
            </>
          )}

          {/* Load More Button - Always show at bottom if there are cards */}
          {cards.length > 0 && (
            <div className="mt-2">
              {onLoadMore ? (
                <button
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border-2 border-dashed border-blue-200 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Load More</span>
                    </div>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 text-sm font-medium text-gray-400 text-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All emails loaded</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
