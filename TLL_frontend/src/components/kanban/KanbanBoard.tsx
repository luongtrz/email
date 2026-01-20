import React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Eye, EyeOff, Filter, ArrowUpDown, MailOpen, Star, Paperclip, Settings } from "lucide-react";
import { useDashboardStore } from "../../store/dashboard.store";
import { useKanbanConfigStore, initializeKanbanConfig } from "../../store/kanbanConfig.store";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { KanbanSettingsModal } from "../modals/KanbanSettingsModal";
import {
  DEFAULT_KANBAN_COLUMNS,
  createCardsFromEmails,
  type KanbanColumn as KanbanColumnType,
  type KanbanCard as KanbanCardType,
} from "../../types/kanban.types";
import type { Email } from "../../types/email.types";

interface KanbanBoardProps {
  emails: Email[];
  columns?: KanbanColumnType[];
  onCardClick: (email: Email) => void;
  onCardStar?: (emailId: string) => void;
  onEmailMove?: (emailId: string, newFolder: string) => void;
  selectedEmailId?: string | null;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  emails,
  columns: propColumns,
  onCardClick,
  onCardStar,
  onEmailMove,
  selectedEmailId,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(
    null
  );
  const [originalColumnId, setOriginalColumnId] = React.useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = React.useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = React.useState<boolean>(false);

  // Get columns from config store or use prop columns (with fallback to defaults)
  const { columns: storeColumns, isInitialized } = useKanbanConfigStore();

  // Initialize config store on mount
  React.useEffect(() => {
    if (!isInitialized) {
      initializeKanbanConfig();
    }
  }, [isInitialized]);

  // Use store columns if available, otherwise fallback to prop columns or defaults
  const columns = isInitialized ? storeColumns : (propColumns || DEFAULT_KANBAN_COLUMNS);

  const [cards, setCards] = React.useState<KanbanCardType[]>(() =>
    createCardsFromEmails(emails, columns)
  );

  // Get filter and sort state from store
  const { filterMode, setFilterMode, sortBy, setSortBy } = useDashboardStore();

  // Update cards when emails change
  React.useEffect(() => {
    setCards(createCardsFromEmails(emails, columns));
  }, [emails, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card || null);
    // Save the original column ID
    setOriginalColumnId(card?.columnId || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the active card
    const activeCard = cards.find((card) => card.id === activeId);
    if (!activeCard) return;

    // Determine target column (could be dropped on column or on another card)
    let targetColumn = columns.find((col) => col.id === overId);
    if (!targetColumn) {
      const targetCard = cards.find((card) => card.id === overId);
      if (targetCard) {
        targetColumn = columns.find((col) => col.id === targetCard.columnId);
      }
    }
    if (!targetColumn) return;

    // Update card position for visual feedback
    if (activeCard.columnId !== targetColumn.id) {
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === activeId ? { ...card, columnId: targetColumn.id } : card
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) {
      // Reset if dropped outside
      setOriginalColumnId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Find the active card
    const activeCard = cards.find((card) => card.id === activeId);
    if (!activeCard) {
      setOriginalColumnId(null);
      return;
    }

    // Determine the target column:
    // 1. Check if dropped directly on a column
    let targetColumn = columns.find((col) => col.id === overId);

    // 2. If not, find which column the dropped card belongs to
    if (!targetColumn) {
      const targetCard = cards.find((card) => card.id === overId);
      if (targetCard) {
        targetColumn = columns.find((col) => col.id === targetCard.columnId);
      }
    }

    if (!targetColumn) {
      setOriginalColumnId(null);
      return;
    }

    // Check if the card moved to a different column using the ORIGINAL column ID
    if (originalColumnId && originalColumnId !== targetColumn.id) {
      onEmailMove?.(activeCard.email.id, targetColumn.id); // Pass column ID
    }

    // Reset original column ID
    setOriginalColumnId(null);
  };

  // Group cards by column
  const cardsByColumn = columns.reduce((acc, column) => {
    acc[column.id] = cards.filter((card) => card.columnId === column.id);
    return acc;
  }, {} as Record<string, KanbanCardType[]>);

  // Filter columns based on showSnoozed toggle
  const visibleColumns = columns.filter(
    (col) => col.status !== 'SNOOZED' || showSnoozed
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Kanban Controls: Filter, Sort, and Snoozed Toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 gap-4 transition-colors duration-300">
        {/* Left: Filter and Sort Controls */}
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as "ALL" | "UNREAD" | "STARRED" | "HAS_ATTACHMENT")}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="ALL">All Emails</option>
              <option value="UNREAD">Unread Only</option>
              <option value="STARRED">Starred Only</option>
              <option value="HAS_ATTACHMENT">Has Attachment</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "sender_asc" | "sender_desc")}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="sender_asc">Sender A-Z</option>
              <option value="sender_desc">Sender Z-A</option>
            </select>
          </div>

          {/* Active Filter Indicator */}
          {filterMode !== "ALL" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
              {filterMode === "UNREAD" && <MailOpen className="w-3 h-3" />}
              {filterMode === "STARRED" && <Star className="w-3 h-3" />}
              {filterMode === "HAS_ATTACHMENT" && <Paperclip className="w-3 h-3" />}
              <span>
                {filterMode === "UNREAD" && "Unread"}
                {filterMode === "STARRED" && "Starred"}
                {filterMode === "HAS_ATTACHMENT" && "Attachments"}
              </span>
            </div>
          )}
        </div>

        {/* Right: Settings and Snoozed Toggle */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Configure Columns"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Snoozed Toggle */}
          <button
            onClick={() => setShowSnoozed(!showSnoozed)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${showSnoozed
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-purple-50 text-purple-600 hover:bg-purple-100"
              }`}
            title={showSnoozed ? "Hide Snoozed Column" : "Show Snoozed Column"}
          >
            {showSnoozed ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span className="text-sm font-medium">Hide Snoozed</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Show Snoozed</span>
                {(() => {
                  const snoozedColumn = columns.find(col => col.status === 'SNOOZED');
                  return snoozedColumn && cardsByColumn[snoozedColumn.id]?.length > 0 && (
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                      {cardsByColumn[snoozedColumn.id].length}
                    </span>
                  );
                })()}
              </>
            )}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop: Horizontal scroll, Mobile/Tablet: Vertical stack */}
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:overflow-x-auto overflow-y-auto pb-6 px-4 flex-1 min-h-0 gap-4">
          {visibleColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] || []}
              onCardClick={onCardClick}
              onCardStar={onCardStar}
              selectedEmailId={selectedEmailId}
              onLoadMore={onLoadMore}
              isLoadingMore={isLoadingMore}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <KanbanCard
              email={activeCard.email}
              onClick={() => { }}
              onStar={onCardStar}
              isSelected={false}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Settings Modal */}
      <KanbanSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
