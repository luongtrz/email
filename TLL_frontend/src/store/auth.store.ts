import { create } from "zustand";
import { authApi } from "../services/auth.service";
import type { User, LoginRequest, RegisterRequest } from "../types/auth.types";
import { logger } from "../lib/logger";

interface AuthState {
  // Access token lưu trong MEMORY (không persist)
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Internal setters
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;

  // Auth methods
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setAccessToken: (token) =>
    set({
      accessToken: token,
      isAuthenticated: !!token,
    }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  login: async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      // Backend sets tokens in httpOnly cookies + returns accessToken in body
      set({
        accessToken: response.data.accessToken,
        user: response.data.user,
        isAuthenticated: true,
      });
      logger.info("Login success!", { email: response.data.user?.email });
    } catch (error) {
      logger.error("Login error", error);
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    // Backend sets tokens in httpOnly cookies + returns accessToken in body
    set({
      accessToken: response.data.accessToken,
      user: response.data.user,
      isAuthenticated: true,
    });
  },

  googleLogin: async (googleToken: string) => {
    const response = await authApi.googleLogin(googleToken);
    set({
      accessToken: response.data.accessToken,
      user: response.data.user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      // Call backend to clear httpOnly cookies
      await authApi.logout();
    } catch (error) {
      logger.error("Logout API error", error);
      // Continue with local cleanup even if API fails
    }

    // Clear local state (access token in memory only)
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  initAuth: async () => {
    set({ isLoading: true });

    try {
      // Call refresh API - refresh token is sent automatically via cookie
      const refreshResponse = await authApi.refreshToken();
      set({ accessToken: refreshResponse.data.accessToken });

      // Get user profile
      const profile = await authApi.getProfile();
      set({
        user: profile.data,
        isAuthenticated: true,
      });
    } catch {
      // No active session - just clear local state, don't call logout API
      // (calling logout when not logged in causes 401 errors)
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
