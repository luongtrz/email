import React, { createContext, useContext, useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth.store";
import { authApi } from "../services/auth.service";
import type { LoginRequest, RegisterRequest } from "../types/auth.types";

interface AuthContextType {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  setUser: (user: any) => void;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    setAccessToken,
    setUser,
    setLoading,
    logout: clearAuth,
    isAuthenticated,
    isLoading,
    user,
  } = useAuthStore();

  // Use ref to ensure initAuth only runs once
  const isInitialized = useRef(false);

  // Initialize auth state khi app load
  useEffect(() => {
    // Skip if already initialized
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initAuth = async () => {
      setLoading(true);

      // PHASE 2: Refresh token is stored in HTTP-only cookies
      // Try to get a new access token using the refresh token in cookie
      try {
        // Call refresh API - refresh token is sent automatically via cookie
        const refreshResponse = await authApi.refreshToken();

        // Lưu access token vào memory
        setAccessToken(refreshResponse.data.accessToken);

        // Lấy thông tin user
        const profile = await authApi.getProfile();
        setUser(profile.data);
      } catch {
        // Token invalid hoặc expired, user not authenticated
        console.log("No active session - user not authenticated");
        clearAuth();
      }

      setLoading(false);
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);

      // Lưu Access Token vào MEMORY (Zustand store)
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      console.log("Login success!");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);

    // Auto login sau khi register
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
  };

  const googleLogin = async (googleToken: string) => {
    const response = await authApi.googleLogin(googleToken);

    // Lưu tokens giống như login thường
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
  };

  const logout = () => {
    // Clear memory
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        register,
        googleLogin,
        logout,
        isAuthenticated,
        isLoading,
        user,
        setUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
