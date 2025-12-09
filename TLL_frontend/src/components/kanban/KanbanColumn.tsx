import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  cards,
  onCardClick,
  onCardStar,
  selectedEmailId,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const cardIds = cards.map((card) => card.id);

  return (
    <div className="flex flex-col w-80 min-h-[600px] bg-gray-50 rounded-lg border border-gray-200">
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color || "#6B7280" }}
            />
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-4 space-y-3 overflow-y-auto transition-colors ${
          isOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""
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
        )}
      </div>
    </div>
  );
};
