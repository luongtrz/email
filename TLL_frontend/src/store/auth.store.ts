import { create } from "zustand";
import { authApi } from "../services/auth.service";
import type { User, LoginRequest, RegisterRequest } from "../types/auth.types";
import { logger } from "../lib/logger";

// LocalStorage key for user info (not tokens - tokens are in HTTP-only cookies)
const USER_KEY = 'user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Internal setters
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;

  // Auth methods
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

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
      // Backend sets tokens in httpOnly cookies
      set({
        user: response.data.user,
        isAuthenticated: true,
      });
      // Cache user info in localStorage
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      logger.info("Login success!", { email: response.data.user?.email });
    } catch (error) {
      logger.error("Login error", error);
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    // Backend sets tokens in httpOnly cookies
    set({
      user: response.data.user,
      isAuthenticated: true,
    });
    // Cache user info in localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
  },

  logout: async () => {
    try {
      // Call backend to clear httpOnly cookies
      await authApi.logout();
    } catch (error) {
      logger.error("Logout API error", error);
      // Continue with local cleanup even if API fails
    }

    // Clear localStorage (only user info, tokens are in cookies)
    localStorage.removeItem(USER_KEY);

    // Clear local state
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  initAuth: async () => {
    set({ isLoading: true });

    try {
      // Try to get profile from backend
      // If cookies are valid, this will succeed
      const profile = await authApi.getProfile();
      set({
        user: profile.data,
        isAuthenticated: true
      });
      // Update cached user info
      localStorage.setItem(USER_KEY, JSON.stringify(profile.data));
    } catch {
      // Not authenticated or session expired
      // Try to restore from localStorage cache first for a smoother UX
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        // We have cached user but cookies might be expired
        // Try to refresh the session
        try {
          await authApi.refreshToken();
          const profile = await authApi.getProfile();
          set({
            user: profile.data,
            isAuthenticated: true
          });
          localStorage.setItem(USER_KEY, JSON.stringify(profile.data));
        } catch {
          // Refresh also failed, clear everything
          localStorage.removeItem(USER_KEY);
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      } else {
        // No cached user, user needs to login
        set({
          user: null,
          isAuthenticated: false,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
