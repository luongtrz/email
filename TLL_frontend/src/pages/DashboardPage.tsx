import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { emailService } from '../services/email.service';
import { FolderList } from '../components/email/FolderList';
import { EmailList } from '../components/email/EmailList';
import { EmailDetail } from '../components/email/EmailDetail';
import type { Email, Folder } from '../types/email.types';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  // Load initial data (folders and seed) - only once
  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Seed mock data on first load (demo purpose)
        if (!sessionStorage.getItem('emails_seeded')) {
          await emailService.seedMockData();
          sessionStorage.setItem('emails_seeded', 'true');
        }

        if (isCancelled) return;

        // Load folders
        const foldersData = await emailService.getMailboxes();
        if (isCancelled) return;
        setFolders(foldersData);

        // Load initial emails
        const emailsData = await emailService.getEmails({
          folder: activeFolder,
          search: searchQuery || undefined,
        });
        if (isCancelled) return;
        setEmails(emailsData);
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load initial data:', error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          isInitialMount.current = false;
        }
      }
    };

    loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []); // Run only once on mount

  // Load emails when folder or search changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) return;
    loadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, searchQuery]);

  const loadEmails = async () => {
    try {
      const emailsData = await emailService.getEmails({
        folder: activeFolder,
        search: searchQuery || undefined,
      });
      setEmails(emailsData);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const handleEmailSelect = async (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (email) {
      setSelectedEmail(email);
      setShowMobileDetail(true);
      
      // Mark as read
      if (!email.read) {
        await emailService.markAsRead(emailId);
        // Update local state
        setEmails(prev =>
          prev.map(e => (e.id === emailId ? { ...e, read: true } : e))
        );
      }
    }
  };

  const handleFolderChange = (folderId: string) => {
    setActiveFolder(folderId);
    setShowMobileDetail(false);
    setShowMobileMenu(false);
    setSelectedEmails(new Set());
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmails();
  };

  const handleBulkDelete = () => {
    console.log('Delete emails:', Array.from(selectedEmails));
    setSelectedEmails(new Set());
  };

  const handleBulkMarkRead = () => {
    setEmails(prev =>
      prev.map(e => selectedEmails.has(e.id) ? { ...e, read: true } : e)
    );
    setSelectedEmails(new Set());
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Header */}
      <header className="bg-white shadow-md border-b border-gray-200 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          {/* Sidebar Toggle - Always visible */}
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setShowSidebar(!showSidebar);
              } else {
                setShowMobileMenu(!showMobileMenu);
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-xl font-bold text-gray-900 hidden lg:block">
              📧 Email Dashboard
            </h1>
            <h1 className="text-lg font-bold text-gray-900 lg:hidden">
              📧 Inbox
            </h1>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompose(true)}
              className="hidden md:flex px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium items-center gap-2"
            >
              <span>✏️</span>
              Compose
            </button>
            <button
              onClick={() => setShowCompose(true)}
              className="md:hidden p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ✏️
            </button>
            <span className="text-sm text-gray-600 hidden lg:block truncate max-w-[150px]">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedEmails.size > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedEmails.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="px-3 py-1 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition"
              >
                Mark Read
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-sm bg-white border border-red-300 text-red-700 rounded hover:bg-red-100 transition"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedEmails(new Set())}
                className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Folder Overlay */}
        {showMobileMenu && (
          <div className="lg:hidden absolute inset-0 bg-black/50 z-40" onClick={() => setShowMobileMenu(false)}>
            <div className="w-64 h-full bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Mailboxes</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  ✕
                </button>
              </div>
              <FolderList
                folders={folders}
                activeFolder={activeFolder}
                onFolderChange={handleFolderChange}
              />
            </div>
          </div>
        )}

        {/* Column 1: Folders - Toggle on desktop, overlay on mobile */}
        <div className={`
          hidden lg:block w-64 flex-shrink-0 transition-all duration-300
          ${showSidebar ? 'translate-x-0' : '-translate-x-64 w-0'}
        `}>
          <FolderList
            folders={folders}
            activeFolder={activeFolder}
            onFolderChange={handleFolderChange}
          />
        </div>

        {/* Column 2: Email List */}
        <div className={`
          ${showMobileDetail ? 'hidden' : 'flex-1'}
          lg:w-96 lg:flex-shrink-0
        `}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading emails...</p>
              </div>
            </div>
          ) : (
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmail?.id || null}
              onEmailSelect={handleEmailSelect}
            />
          )}
        </div>

        {/* Column 3: Email Detail - Full width on mobile/tablet, 40% on desktop */}
        <div className={`
          ${showMobileDetail ? 'flex-1' : 'hidden'}
          lg:flex lg:flex-1
        `}>
          <EmailDetail
            email={selectedEmail}
            onClose={() => setShowMobileDetail(false)}
          />
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCompose(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">New Message</h2>
                <button
                  onClick={() => setShowCompose(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    rows={8}
                    placeholder="Type your message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
