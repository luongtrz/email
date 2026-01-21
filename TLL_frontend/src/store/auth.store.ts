import { create } from "zustand";
import { authApi } from "../services/auth.service";
import type { User, LoginRequest, RegisterRequest } from "../types/auth.types";
import { logger } from "../lib/logger";

// LocalStorage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

interface AuthState {
  // Access token lưu trong MEMORY (không persist)
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Internal setters
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
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

  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    set({
      accessToken: token,
      isAuthenticated: !!token,
    });
  },

  setRefreshToken: (token) => {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    set({
      user,
      isAuthenticated: !!user,
    });
  },

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

    // Clear localStorage
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Clear local state
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  initAuth: async () => {
    set({ isLoading: true });

    try {
      // First, try to restore from localStorage
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        // Restore from localStorage
        set({
          accessToken: storedToken,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
        });

        // Verify token is still valid by getting profile
        try {
          const profile = await authApi.getProfile();
          set({ user: profile.data });
          localStorage.setItem(USER_KEY, JSON.stringify(profile.data));
        } catch {
          // Token expired, try refresh
          if (storedRefreshToken) {
            try {
              const refreshResponse = await authApi.refreshToken();
              const newToken = refreshResponse.data.accessToken;
              localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
              set({ accessToken: newToken });

              const profile = await authApi.getProfile();
              set({ user: profile.data });
              localStorage.setItem(USER_KEY, JSON.stringify(profile.data));
            } catch {
              // Refresh failed, clear everything
              localStorage.removeItem(ACCESS_TOKEN_KEY);
              localStorage.removeItem(REFRESH_TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              set({
                accessToken: null,
                user: null,
                isAuthenticated: false,
              });
            }
          } else {
            // No refresh token, clear everything
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            set({
              accessToken: null,
              user: null,
              isAuthenticated: false,
            });
          }
        }
      } else {
        // No stored auth, user needs to login
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        });
      }
    } catch {
      logger.error("InitAuth error");
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
