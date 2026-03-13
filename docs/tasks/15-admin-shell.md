# Task 15: Admin Shell & Auth

## Overview

Set up the full admin dashboard shell with React 19, Vite 6, Tailwind CSS 4, shadcn/ui, authentication flow, and layout components (sidebar, header). This provides the foundation for all admin UI features in Tasks 16-20.

## Subtasks

1. [ ] Set up React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui in apps/admin
2. [ ] Create CSS theme with oklch() color system and --brand-hue variable
3. [ ] Install shadcn/ui components
4. [ ] Create layout components: DashboardLayout, Sidebar, Header
5. [ ] Create auth store (Zustand)
6. [ ] Create API client with bearer token
7. [ ] Create login page + protected routes
8. [ ] Verify: login works, dashboard layout renders, sidebar navigation works

## Details

### CSS Theme (`apps/admin/src/index.css`)

Use oklch() color system with a brand-hue variable for easy theming. Reference the pattern from `/home/redman/amt-mobility/apps/admin/src/index.css`:

```css
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --brand-hue: 250;

  --color-background: oklch(0.99 0.005 var(--brand-hue));
  --color-foreground: oklch(0.15 0.02 var(--brand-hue));
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.15 0.02 var(--brand-hue));
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.15 0.02 var(--brand-hue));
  --color-primary: oklch(0.55 0.18 var(--brand-hue));
  --color-primary-foreground: oklch(0.98 0.01 var(--brand-hue));
  --color-secondary: oklch(0.95 0.02 var(--brand-hue));
  --color-secondary-foreground: oklch(0.25 0.03 var(--brand-hue));
  --color-muted: oklch(0.95 0.01 var(--brand-hue));
  --color-muted-foreground: oklch(0.5 0.02 var(--brand-hue));
  --color-accent: oklch(0.95 0.02 var(--brand-hue));
  --color-accent-foreground: oklch(0.25 0.03 var(--brand-hue));
  --color-destructive: oklch(0.55 0.2 25);
  --color-destructive-foreground: oklch(0.98 0.01 25);
  --color-border: oklch(0.9 0.01 var(--brand-hue));
  --color-input: oklch(0.9 0.01 var(--brand-hue));
  --color-ring: oklch(0.55 0.18 var(--brand-hue));
  --color-sidebar: oklch(0.97 0.01 var(--brand-hue));
  --color-sidebar-foreground: oklch(0.25 0.03 var(--brand-hue));
  --color-sidebar-accent: oklch(0.92 0.03 var(--brand-hue));
  --color-sidebar-accent-foreground: oklch(0.2 0.03 var(--brand-hue));
  --color-sidebar-border: oklch(0.88 0.015 var(--brand-hue));

  --radius-lg: 0.75rem;
  --radius-md: 0.5rem;
  --radius-sm: 0.25rem;
}

/* Dark mode overrides */
.dark {
  --color-background: oklch(0.12 0.02 var(--brand-hue));
  --color-foreground: oklch(0.93 0.01 var(--brand-hue));
  --color-card: oklch(0.15 0.02 var(--brand-hue));
  --color-card-foreground: oklch(0.93 0.01 var(--brand-hue));
  --color-popover: oklch(0.15 0.02 var(--brand-hue));
  --color-popover-foreground: oklch(0.93 0.01 var(--brand-hue));
  --color-primary: oklch(0.65 0.18 var(--brand-hue));
  --color-primary-foreground: oklch(0.12 0.02 var(--brand-hue));
  --color-secondary: oklch(0.2 0.02 var(--brand-hue));
  --color-secondary-foreground: oklch(0.9 0.01 var(--brand-hue));
  --color-muted: oklch(0.2 0.015 var(--brand-hue));
  --color-muted-foreground: oklch(0.6 0.02 var(--brand-hue));
  --color-accent: oklch(0.2 0.02 var(--brand-hue));
  --color-accent-foreground: oklch(0.9 0.01 var(--brand-hue));
  --color-border: oklch(0.25 0.02 var(--brand-hue));
  --color-input: oklch(0.25 0.02 var(--brand-hue));
  --color-ring: oklch(0.65 0.18 var(--brand-hue));
  --color-sidebar: oklch(0.1 0.02 var(--brand-hue));
  --color-sidebar-foreground: oklch(0.9 0.01 var(--brand-hue));
  --color-sidebar-accent: oklch(0.18 0.025 var(--brand-hue));
  --color-sidebar-accent-foreground: oklch(0.93 0.01 var(--brand-hue));
  --color-sidebar-border: oklch(0.22 0.02 var(--brand-hue));
}
```

### shadcn/ui Components to Install

Run `npx shadcn@latest add` for each:
button, input, label, card, dropdown-menu, avatar, sheet, separator, badge, skeleton, dialog, select, textarea, table, tabs, toast, tooltip, scroll-area, command, popover, calendar

### Auth Store (`apps/admin/src/stores/auth-store.ts`)

Reference `/home/redman/amt-mobility/apps/admin/src/stores/auth-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        set({
          token: response.token,
          user: response.user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const user = await api.get('/auth/me');
          set({ user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'renderforge-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

### API Client (`apps/admin/src/lib/api.ts`)

Reference `/home/redman/amt-mobility/apps/admin/src/lib/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100/api';

class ApiClient {
  private getToken(): string | null {
    try {
      const stored = localStorage.getItem('renderforge-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.token || null;
      }
    } catch {}
    return null;
  }

  private async request(method: string, path: string, body?: unknown) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      localStorage.removeItem('renderforge-auth');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body?: unknown) { return this.request('POST', path, body); }
  put(path: string, body?: unknown) { return this.request('PUT', path, body); }
  patch(path: string, body?: unknown) { return this.request('PATCH', path, body); }
  delete(path: string) { return this.request('DELETE', path); }

  async upload(path: string, formData: FormData) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();
```

### Layout Components

#### DashboardLayout (`apps/admin/src/components/layout/dashboard-layout.tsx`)

```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

#### Sidebar (`apps/admin/src/components/layout/sidebar.tsx`)

Collapsible sidebar with navigation items:
- Dashboard (LayoutDashboard icon)
- Content (FileText icon) — links to /posts
- Renders (Film icon) — links to /renders
- Social (Share2 icon) — links to /social
- Calendar (Calendar icon) — links to /calendar
- Analytics (BarChart3 icon) — links to /analytics
- Settings (Settings icon) — links to /settings

Features:
- Collapse/expand toggle
- Active route highlighting
- RenderForge logo at top
- User avatar + name at bottom

#### Header (`apps/admin/src/components/layout/header.tsx`)

- Mobile menu button (opens sidebar as sheet on mobile)
- Breadcrumb (based on current route)
- Theme toggle (light/dark mode using `class` strategy)
- User dropdown menu (profile, settings, logout)

### Routing (`apps/admin/src/App.tsx`)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { LoginPage } from './features/auth/login-page';
import { ProtectedRoute } from './features/auth/protected-route';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<div>Dashboard (Task 16)</div>} />
              <Route path="/posts" element={<div>Posts (Task 17)</div>} />
              <Route path="/renders" element={<div>Renders (Task 18)</div>} />
              <Route path="/niches" element={<div>Niches (Task 19)</div>} />
              <Route path="/settings" element={<div>Settings (Task 20)</div>} />
              <Route path="/social" element={<div>Social (Task 26)</div>} />
              <Route path="/calendar" element={<div>Calendar (Task 26)</div>} />
              <Route path="/analytics" element={<div>Analytics (Task 27)</div>} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### Protected Route

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

export function ProtectedRoute() {
  const { isAuthenticated, token } = useAuthStore();

  if (!token) return <Navigate to="/login" />;

  return <Outlet />;
}
```

### Login Page (`apps/admin/src/features/auth/login-page.tsx`)

- Clean centered card layout
- Email + password inputs
- "Sign in to RenderForge" heading
- Loading state on submit
- Error toast on failure
- Redirect to /dashboard on success

### Vite Config

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
});
```

### Theme Toggle

Create `apps/admin/src/hooks/use-theme.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeStore = {
  theme: 'light' | 'dark';
  toggle: () => void;
};

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      toggle: () => set((s) => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', next === 'dark');
        return { theme: next };
      }),
    }),
    { name: 'renderforge-theme' }
  )
);
```

## Verification

1. `pnpm dev:admin` starts Vite on port 5173
2. Navigating to `http://localhost:5173` redirects to `/login`
3. Login with admin@renderforge.com / admin123 succeeds
4. Dashboard layout renders with sidebar and header
5. Sidebar navigation between pages works
6. Theme toggle switches between light and dark mode
7. Logout clears auth and redirects to login
8. Refreshing the page maintains auth state (persisted in localStorage)
9. Mobile responsive: sidebar collapses to sheet on small screens
10. All shadcn/ui components are available and styled correctly
