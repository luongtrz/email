import React from 'react';
import { Inbox, Send, Star, Archive, Trash2, Mail, Plus } from 'lucide-react';
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
  isCollapsed?: boolean;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  activeFolder,
  onFolderChange,
  onCompose,
  isCollapsed = false,
}) => {
  return (
    <div className="h-full bg-transparent flex flex-col pt-4 pb-4">
      <div className="px-3 flex flex-col items-center">
        {/* Primary Action Button (Compose) */}
        {onCompose && (
          <button
            onClick={onCompose}
            className={`mb-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:shadow-xl transition-all duration-200 active:scale-95 ${isCollapsed ? "w-12 h-12 rounded-2xl p-0" : "w-full py-3 rounded-xl"
              }`}
            title={isCollapsed ? "Compose" : undefined}
          >
            {isCollapsed ? (
              <Plus className="w-6 h-6" />
            ) : (
              <>
                <Plus className="w-5 h-5" strokeWidth={2.5} />
                <span className="font-semibold text-[15px]">New Message</span>
              </>
            )}
          </button>
        )}

        {/* Mailboxes Navigation - Pill Style */}
        <nav className="space-y-1.5 w-full">
          {folders.map((folder) => {
            const icon = FOLDER_ICONS[folder.id.toLowerCase()] || FOLDER_ICONS.default;
            const isActive = activeFolder === folder.id;

            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={`
                  w-full flex items-center transition-all duration-200 text-sm group relative overflow-hidden
                  ${isCollapsed
                    ? "justify-center h-10 w-10 mx-auto rounded-xl"
                    : "justify-between px-4 py-2.5 rounded-xl"
                  }
                  ${isActive
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
                title={isCollapsed ? `${folder.name}${folder.count > 0 ? ` (${folder.count})` : ""}` : undefined}
              >
                {isCollapsed ? (
                  <div className="relative flex items-center justify-center">
                    <div className={`${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`}>
                      {icon}
                    </div>

                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        {icon}
                      </div>
                      <span className="tracking-tight">{folder.name}</span>
                    </div>
                    {(folder.count > 0) && (
                      <span className={`text-xs ${isActive ? 'font-bold text-white/90' : 'font-medium text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                        {folder.count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
