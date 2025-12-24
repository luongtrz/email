import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import type { KanbanColumnConfig, GmailLabel } from "../../types/kanban-config.types";
import { KanbanEmailStatus } from "../../types/kanban.types";
import { LabelSelector } from "../kanban/LabelSelector";

interface ColumnEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: Partial<KanbanColumnConfig>) => void;
  column?: KanbanColumnConfig | null;
  availableLabels: GmailLabel[];
  isLoadingLabels?: boolean;
  labelsError?: string | null;
  existingColumns: KanbanColumnConfig[];
}

const DEFAULT_COLORS = [
  "#3B82F6", // Blue
  "#F59E0B", // Orange
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#6B7280", // Gray
  "#EC4899", // Pink
  "#14B8A6", // Teal
];

const DEFAULT_ICONS = [
  "inbox",
  "clipboard-list",
  "clock",
  "check-circle",
  "moon",
  "star",
  "flag",
  "bookmark",
];

export function ColumnEditorModal({
  isOpen,
  onClose,
  onSave,
  column,
  availableLabels,
  isLoadingLabels = false,
  labelsError = null,
  existingColumns,
}: ColumnEditorModalProps) {
  const isEditMode = Boolean(column);
  const isSystemColumn = column?.isSystem || false;

  // Form state
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>("TODO");
  const [gmailLabelId, setGmailLabelId] = useState<string | null>(null);
  const [gmailLabelName, setGmailLabelName] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [icon, setIcon] = useState(DEFAULT_ICONS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with column data
  useEffect(() => {
    if (column) {
      setTitle(column.title);
      setStatus(column.status);
      setGmailLabelId(column.gmailLabelId);
      setGmailLabelName(column.gmailLabelName);
      setColor(column.color);
      setIcon(column.icon);
    } else {
      // Reset for create mode
      setTitle("");
      setStatus("TODO");
      setGmailLabelId(null);
      setGmailLabelName(null);
      setColor(DEFAULT_COLORS[0]);
      setIcon(DEFAULT_ICONS[0]);
    }
    setErrors({});
  }, [column]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 50) {
      newErrors.title = "Title must be 50 characters or less";
    }

    // Status validation
    const trimmedStatus = status.trim();

    if (!trimmedStatus) {
      newErrors.status = "Status is required";
    } else if (trimmedStatus.length > 50) {
      newErrors.status = "Status must be 50 characters or less";
    } else {
      // Check for duplicate status (case-insensitive) - BLOCKING
      const duplicateStatus = existingColumns.find(
        (col) => col.status.toUpperCase() === trimmedStatus.toUpperCase() && col.id !== column?.id
      );
      if (duplicateStatus) {
        newErrors.status = `Column "${duplicateStatus.title}" already uses status "${duplicateStatus.status}"`;
      }

      // Prevent using SNOOZED for non-system columns
      if (trimmedStatus.toUpperCase() === 'SNOOZED' && !isSystemColumn) {
        newErrors.status = 'SNOOZED is reserved for the system Snoozed column';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // BLOCK if any errors
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const columnData: Partial<KanbanColumnConfig> = {
      title: title.trim(),
      status: status.trim(),
      gmailLabelId,
      gmailLabelName,
      color,
      icon,
      isSystem: column?.isSystem === true,
      order: column?.order ?? existingColumns.length,
    };

    onSave(columnData);
    onClose();
  };

  const handleLabelSelect = (labelId: string | null, labelName: string | null) => {
    setGmailLabelId(labelId);
    setGmailLabelName(labelName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Column' : 'Add Column'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Urgent, Waiting for Reply"
              maxLength={50}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{title.length}/50 characters</p>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <input
              id="status"
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value.toUpperCase())}
              disabled={isSystemColumn}
              placeholder="e.g., URGENT, WAITING_FOR_REPLY"
              maxLength={50}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.status ? 'border-red-300' : 'border-gray-300'
              } ${isSystemColumn ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            />
            {errors.status && (
              <p className="mt-1 text-xs text-red-600">{errors.status}</p>
            )}
            {isSystemColumn && (
              <p className="mt-1 text-xs text-gray-500">System column status cannot be changed</p>
            )}
            {!isSystemColumn && (
              <p className="mt-1 text-xs text-gray-500">
                Use uppercase snake_case (e.g., WAITING_FOR_REPLY)
              </p>
            )}
          </div>

          {/* Gmail Label */}
          {!isSystemColumn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gmail Label (Optional)
              </label>
              <LabelSelector
                labels={availableLabels}
                selectedLabelId={gmailLabelId}
                selectedLabelName={gmailLabelName}
                onSelect={handleLabelSelect}
                isLoading={isLoadingLabels}
                error={labelsError}
              />
              <p className="mt-1 text-xs text-gray-500">
                When a card is moved to this column, the selected Gmail label will be applied
              </p>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === colorOption ? 'border-gray-900 scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  title={colorOption}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_ICONS.map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  onClick={() => setIcon(iconOption)}
                  className={`px-3 py-2 text-sm border rounded-lg transition-all ${
                    icon === iconOption
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEditMode ? 'Save Changes' : 'Add Column'}
          </button>
        </div>
      </div>
    </div>
  );
}
