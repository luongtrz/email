import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { authApi } from "../services/auth.service";
import { logger } from "../lib/logger";

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const success = searchParams.get("success");
        const errorParam = searchParams.get("error");

        if (errorParam) {
          setError(`Authentication failed: ${errorParam}`);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (success !== "true") {
          setError("Invalid callback data received");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Cookies are already set by the backend
        // Just fetch user profile to confirm authentication
        setLoading(true);
        const profile = await authApi.getProfile();
        setUser(profile.data);

        // Success! Redirect to inbox
        navigate("/inbox");
      } catch (err: unknown) {
        logger.error("OAuth callback error", err);
        setError("Failed to authenticate with Google. Please try again.");
        setTimeout(() => navigate("/login"), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, setLoading]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mb-4 text-red-500">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Connecting Gmail Account
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please wait while we complete the authentication...
        </p>
      </div>
    </div>
  );
};
