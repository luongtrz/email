import { useState, useEffect } from "react";
import { X, Plus, RotateCcw, AlertCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";

import { useKanbanConfigStore } from "../../store/kanbanConfig.store";
import { gmailService } from "../../services/gmail.service";
import type { KanbanColumnConfig } from "../../types/kanban-config.types";
import { ColumnCard } from "../kanban/ColumnCard";
import { ColumnEditorModal } from "./ColumnEditorModal";

interface KanbanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sortable wrapper for ColumnCard
function SortableColumnCard({
  column,
  onEdit,
  onDelete,
  labelDeleted,
}: {
  column: KanbanColumnConfig;
  onEdit: (column: KanbanColumnConfig) => void;
  onDelete: (columnId: string) => void;
  labelDeleted: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ColumnCard
        column={column}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        labelDeleted={labelDeleted}
      />
    </div>
  );
}

export function KanbanSettingsModal({ isOpen, onClose }: KanbanSettingsModalProps) {
  const {
    columns,
    availableGmailLabels,
    error: storeError,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    resetToDefaults,
    setGmailLabels,
    clearError,
  } = useKanbanConfigStore();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch Gmail labels when modal opens
  useEffect(() => {
    if (isOpen && availableGmailLabels.length === 0) {
      fetchLabels();
    }
  }, [isOpen]);

  const fetchLabels = async () => {
    setIsLoadingLabels(true);
    setLabelsError(null);
    try {
      const labels = await gmailService.getLabels();
      setGmailLabels(labels);
    } catch (error: any) {
      console.error('Failed to fetch Gmail labels:', error);
      setLabelsError(error.message || 'Failed to load Gmail labels');
      toast.error('Failed to load Gmail labels');
    } finally {
      setIsLoadingLabels(false);
    }
  };

  // Check if any column has a deleted label
  const getDeletedLabels = (): Set<string> => {
    const deletedLabelIds = new Set<string>();
    const availableLabelIds = new Set(availableGmailLabels.map((label) => label.id));

    columns.forEach((column) => {
      if (column.gmailLabelId && !availableLabelIds.has(column.gmailLabelId)) {
        deletedLabelIds.add(column.id);
      }
    });

    return deletedLabelIds;
  };

  const deletedLabels = getDeletedLabels();

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderColumns(oldIndex, newIndex);
        toast.success('Column order updated');
      }
    }
  };

  // Handle add column
  const handleAddColumn = () => {
    setEditingColumn(null);
    setIsEditorOpen(true);
  };

  // Handle edit column
  const handleEditColumn = (column: KanbanColumnConfig) => {
    setEditingColumn(column);
    setIsEditorOpen(true);
  };

  // Handle save column (create or update)
  const handleSaveColumn = (columnData: Partial<KanbanColumnConfig>) => {
    try {
      if (editingColumn) {
        // Update existing column
        updateColumn(editingColumn.id, columnData);
        toast.success('Column updated successfully');
      } else {
        // Add new column
        addColumn({
          title: columnData.title!,
          status: columnData.status!,
          gmailLabelId: columnData.gmailLabelId || null,
          gmailLabelName: columnData.gmailLabelName || null,
          color: columnData.color!,
          icon: columnData.icon!,
          isSystem: false,
          order: columnData.order || columns.length,
        });
        toast.success('Column added successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save column');
    }
  };

  // Handle delete column
  const handleDeleteColumn = (columnId: string) => {
    try {
      deleteColumn(columnId);
      toast.success('Column deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete column');
    }
  };

  // Handle reset to defaults
  const handleResetToDefaults = () => {
    if (
      window.confirm(
        'Are you sure you want to reset to default columns? This will delete all custom columns and label mappings.'
      )
    ) {
      resetToDefaults();
      toast.success('Reset to default columns');
    }
  };

  // Clear store error on mount
  useEffect(() => {
    if (storeError) {
      toast.error(storeError);
      clearError();
    }
  }, [storeError]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Kanban Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Customize your Kanban columns and map them to Gmail labels
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Error Banner */}
            {labelsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Failed to load Gmail labels</p>
                  <p className="text-sm text-red-700 mt-1">{labelsError}</p>
                  <button
                    onClick={fetchLabels}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Column List */}
            <div className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map((col) => col.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <SortableColumnCard
                      key={column.id}
                      column={column}
                      onEdit={handleEditColumn}
                      onDelete={handleDeleteColumn}
                      labelDeleted={deletedLabels.has(column.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Add Column Button */}
            <button
              onClick={handleAddColumn}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Column</span>
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleResetToDefaults}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Column Editor Modal */}
      <ColumnEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleSaveColumn}
        column={editingColumn}
        availableLabels={availableGmailLabels}
        isLoadingLabels={isLoadingLabels}
        labelsError={labelsError}
        existingColumns={columns}
      />
    </>
  );
}
