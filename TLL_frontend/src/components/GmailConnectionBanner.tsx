import React from 'react';
import { authApi } from '../services/auth.service';
import { logger } from '../lib/logger';

interface GmailConnectionBannerProps {
  onConnected?: () => void;
}

export const GmailConnectionBanner: React.FC<GmailConnectionBannerProps> = () => {
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { url } = await authApi.getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = url;
    } catch (error) {
      logger.error('Failed to get Google auth URL', error);
      alert('Failed to initiate Gmail connection');
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Gmail Account Not Connected
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Connect your Gmail account to access your emails
            </p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {isConnecting ? 'Connecting...' : ' Connect Gmail'}
        </button>
      </div>
    </div>
  );
};
