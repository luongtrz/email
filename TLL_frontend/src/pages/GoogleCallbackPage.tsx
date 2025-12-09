import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { logger } from "../lib/logger";

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const userJson = searchParams.get("user");
        const error = searchParams.get("error");

        if (error) {
          setError(`Authentication failed: ${error}`);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (!accessToken || !refreshToken || !userJson) {
          setError("Invalid callback data received");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userJson));

        // Store access token in memory only
        // Refresh token is already in httpOnly cookie set by backend
        setAccessToken(accessToken);
        setUser(user);

        // Success! Redirect to inbox
        navigate("/inbox");
      } catch (err: unknown) {
        const error = err as Record<string, unknown>;
        const response = error?.response as Record<string, unknown>;
        const data = response?.data as Record<string, unknown>;
        logger.error("OAuth callback error", err);
        setError(String(data?.message) || "Failed to authenticate with Google");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, setAccessToken]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Connecting Gmail Account
        </h2>
        <p className="text-gray-600">
          Please wait while we complete the authentication...
        </p>
      </div>
    </div>
  );
};
