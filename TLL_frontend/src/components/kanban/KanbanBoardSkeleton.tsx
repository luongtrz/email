import React from "react";

export const KanbanBoardSkeleton: React.FC = () => {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 px-4">
      {[0, 1, 2, 3, 4].map((columnIdx) => (
        <div
          key={columnIdx}
          className="flex flex-col w-80 min-h-[600px] bg-gray-50 rounded-lg border border-gray-200 flex-shrink-0"
        >
          {/* Column Header Skeleton */}
          <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="h-5 w-24 bg-gray-300 rounded animate-pulse" />
              </div>
              <div className="h-6 w-8 bg-gray-300 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {[0, 1, 2].map((cardIdx) => (
              <div
                key={cardIdx}
                className="bg-white border rounded-lg p-4 space-y-3 animate-pulse"
              >
                {/* Avatar + Sender */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-300 rounded mb-1" />
                    <div className="h-3 w-32 bg-gray-300 rounded" />
                  </div>
                  <div className="h-4 w-8 bg-gray-300 rounded" />
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <div className="h-4 w-full bg-gray-300 rounded" />
                  <div className="h-4 w-3/4 bg-gray-300 rounded" />
                </div>

                {/* Preview */}
                <div className="space-y-1">
                  <div className="h-3 w-full bg-gray-300 rounded" />
                  <div className="h-3 w-5/6 bg-gray-300 rounded" />
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div className="h-3 w-12 bg-gray-300 rounded" />
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
