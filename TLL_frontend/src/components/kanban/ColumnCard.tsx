import { GripVertical, Edit2, Trash2, Tag, AlertTriangle } from "lucide-react";
import type { KanbanColumnConfig } from "../../types/kanban-config.types";

interface ColumnCardProps {
  column: KanbanColumnConfig;
  onEdit: (column: KanbanColumnConfig) => void;
  onDelete: (columnId: string) => void;
  isDragging?: boolean;
  labelDeleted?: boolean;
  dragListeners?: any;
}

export function ColumnCard({
  column,
  onEdit,
  onDelete,
  isDragging = false,
  labelDeleted = false,
  dragListeners,
}: ColumnCardProps) {
  const handleDelete = () => {
    if (column.isSystem) {
      return; // Should not happen due to disabled state
    }

    // Confirm deletion
    if (window.confirm(`Are you sure you want to delete the column "${column.title}"?`)) {
      onDelete(column.id);
    }
  };

  return (
    <div
      className={`
        group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg
        transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg' : 'hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'}
      `}
    >
      {/* Drag Handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...dragListeners}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Column Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Color Indicator */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />

          {/* Title */}
          <h3 className="font-medium text-gray-900 dark:text-slate-200 truncate">
            {column.title}
          </h3>

          {/* System Badge */}
          {column.isSystem && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded">
              System
            </span>
          )}
        </div>

        {/* Status and Label Info */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Status: <span className="font-mono text-gray-700 dark:text-slate-300">{column.status}</span>
          </p>

          {/* Gmail Label Badge */}
          {column.gmailLabelId ? (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-gray-400 dark:text-slate-500" />
              <span className="text-xs text-gray-600 dark:text-slate-300">
                {column.gmailLabelName}
              </span>
              {labelDeleted && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">Label deleted</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-gray-300 dark:text-slate-600" />
              <span className="text-xs text-gray-400 dark:text-slate-500">No label mapped</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit Button */}
        <button
          type="button"
          onClick={() => onEdit(column)}
          className="p-2 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
          title="Edit column"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={column.isSystem}
          className={`
            p-2 rounded transition-colors
            ${column.isSystem
              ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            }
          `}
          title={column.isSystem ? 'System column cannot be deleted' : 'Delete column'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
