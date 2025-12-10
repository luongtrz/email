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
import { Eye, EyeOff } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
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
  columns = DEFAULT_KANBAN_COLUMNS,
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
  const [cards, setCards] = React.useState<KanbanCardType[]>(() =>
    createCardsFromEmails(emails, columns)
  );

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
    (col) => col.id !== "snoozed" || showSnoozed
  );

  return (
    <>
      {/* Toggle for Snoozed Column */}
      <div className="flex justify-end px-4 py-2 bg-white border-b border-gray-200">
        <button
          onClick={() => setShowSnoozed(!showSnoozed)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            showSnoozed
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
              {cardsByColumn["snoozed"]?.length > 0 && (
                <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                  {cardsByColumn["snoozed"].length}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop: Horizontal scroll, Mobile/Tablet: Vertical stack */}
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:overflow-x-auto pb-6 px-4 min-h-[600px] gap-4">
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
              onClick={() => {}}
              onStar={onCardStar}
              isSelected={false}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
