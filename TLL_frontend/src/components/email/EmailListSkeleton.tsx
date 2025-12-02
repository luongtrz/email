import React from 'react';

export const EmailListSkeleton: React.FC = () => {
  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="divide-y divide-gray-100">
        {[...Array(15)].map((_, index) => (
          <div key={index} className="px-4 py-2 animate-pulse">
            <div className="flex items-center gap-3">
              {/* Checkbox skeleton */}
              <div className="flex-shrink-0 w-4 h-4 bg-gray-200 rounded" />
              
              {/* Star skeleton */}
              <div className="flex-shrink-0 w-4 h-4 bg-gray-200 rounded" />

              {/* Content skeleton - single line like EmailList */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="h-3.5 bg-gray-200 rounded w-32 flex-shrink-0" />
                <div className="h-3.5 bg-gray-200 rounded w-48 flex-shrink-0" />
                <div className="h-3 bg-gray-200 rounded flex-1 min-w-0" />
              </div>
              
              {/* Date skeleton */}
              <div className="flex-shrink-0 h-3 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
