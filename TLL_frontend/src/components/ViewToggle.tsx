import React from "react";
import { List, Kanban } from "lucide-react";
import { useDashboardStore, type ViewMode } from "../store/dashboard.store";

interface ViewToggleProps {
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ className = "" }) => {
  const { viewMode, setViewMode } = useDashboardStore();

  const handleToggle = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div
      className={`flex items-center bg-gray-100 rounded-lg p-1 ${className}`}
    >
      <button
        onClick={() => handleToggle("traditional")}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === "traditional"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        title="Traditional List View"
      >
        <List size={16} />
        <span className="hidden sm:inline">List</span>
      </button>

      <button
        onClick={() => handleToggle("kanban")}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === "kanban"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        title="Kanban Board View"
      >
        <Kanban size={16} />
        <span className="hidden sm:inline">Kanban</span>
      </button>
    </div>
  );
};
