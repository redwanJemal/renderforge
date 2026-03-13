import { create } from "zustand";
import { api, ApiError } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

type TokenResponse = {
  token: string;
  user: User;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  loadFromStorage: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setAuth: (token, user) => {
    localStorage.setItem("rf_token", token);
    localStorage.setItem("rf_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true, error: null });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<TokenResponse>("/api/auth/login", {
        email,
        password,
      });
      get().setAuth(data.token, data.user);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Login failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("rf_token");
    localStorage.removeItem("rf_user");
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
    window.location.href = "/login";
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("rf_token");
    const userStr = localStorage.getItem("rf_user");
    if (token && userStr) {
      try {
        set({
          token,
          user: JSON.parse(userStr),
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem("rf_token");
        localStorage.removeItem("rf_user");
      }
    }
  },

  fetchMe: async () => {
    try {
      const user = await api.get<User>("/api/auth/me");
      localStorage.setItem("rf_user", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null }),
}));
