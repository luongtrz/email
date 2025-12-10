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
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  emails,
  columns = DEFAULT_KANBAN_COLUMNS,
  onCardClick,
  onCardStar,
  onEmailMove,
  selectedEmailId,
}) => {
  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(
    null
  );
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
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the active card
    const activeCard = cards.find((card) => card.id === activeId);
    if (!activeCard) return;

    // Find the target column
    const targetColumn = columns.find((col) => col.id === overId);
    if (!targetColumn) return;

    // If dropping on a column, move the card to that column
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

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the active card
    const activeCard = cards.find((card) => card.id === activeId);
    if (!activeCard) return;

    // Find the target column
    const targetColumn = columns.find((col) => col.id === overId);
    if (!targetColumn) return;

    // If the card moved to a different column, update the email
    if (activeCard.columnId !== targetColumn.id) {
      onEmailMove?.(activeCard.email.id, targetColumn.emailFolder);
    }
  };

  // Group cards by column
  const cardsByColumn = columns.reduce((acc, column) => {
    acc[column.id] = cards.filter((card) => card.columnId === column.id);
    return acc;
  }, {} as Record<string, KanbanCardType[]>);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-6 px-4 min-h-[600px]">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={cardsByColumn[column.id] || []}
            onCardClick={onCardClick}
            onCardStar={onCardStar}
            selectedEmailId={selectedEmailId}
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
  );
};
