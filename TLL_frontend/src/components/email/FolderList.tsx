import React from 'react';
import { Inbox, Send, Star, Archive, Trash2, Mail } from 'lucide-react';
import type { Folder } from '../../types/email.types';

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox className="w-5 h-5" />,
  sent: <Send className="w-5 h-5" />,
  starred: <Star className="w-5 h-5" />,
  archive: <Archive className="w-5 h-5" />,
  trash: <Trash2 className="w-5 h-5" />,
  default: <Mail className="w-5 h-5" />,
};

interface FolderListProps {
  folders: Folder[];
  activeFolder: string;
  onFolderChange: (folderId: string) => void;
  onCompose?: () => void;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  activeFolder,
  onFolderChange,
  onCompose,
}) => {
  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="p-2 flex flex-col items-center">
        {/* Gmail-style Compose Button */}
        {onCompose && (
          <button
            onClick={onCompose}
            className="mb-4 flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all w-auto"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-medium">Compose</span>
          </button>
        )}

        {/* Mailboxes */}
        <nav className="space-y-0.5 w-full">
          {folders.map((folder) => {
            const icon = FOLDER_ICONS[folder.id.toLowerCase()] || FOLDER_ICONS.default;
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-r-full text-sm font-medium transition-all
                  ${
                    activeFolder === folder.id
                      ? 'bg-red-100 text-red-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={activeFolder === folder.id ? 'text-red-700' : 'text-gray-600'}>
                    {icon}
                  </div>
                  <span>{folder.name}</span>
                </div>
                {folder.count > 0 && (
                  <span className="text-xs font-semibold text-gray-600">
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
