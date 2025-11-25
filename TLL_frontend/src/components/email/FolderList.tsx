import React from 'react';
import type { Folder } from '../../types/email.types';

interface FolderListProps {
  folders: Folder[];
  activeFolder: string;
  onFolderChange: (folderId: string) => void;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  activeFolder,
  onFolderChange,
}) => {
  return (
    <div className="h-full bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 px-3">
          Mailboxes
        </h2>
        <nav className="space-y-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${
                  activeFolder === folder.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{folder.icon}</span>
                <span>{folder.name}</span>
              </div>
              {folder.count > 0 && (
                <span
                  className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full
                    ${
                      activeFolder === folder.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
