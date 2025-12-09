import React from "react";

export const EmailListLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm">Loading more emails...</span>
      </div>
    </div>
  );
};
