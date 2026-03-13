# Task 03: Hono API Server with Auth

## Overview

Build the Hono API server with JWT authentication, error handling, request logging, auth routes, health check, and template listing. This is the core API that all subsequent features build upon.

## Subtasks

1. [ ] Create `apps/api/src/config.ts` — Zod-validated environment configuration
2. [ ] Create `apps/api/src/middleware/auth.ts` — JWT auth middleware using jose
3. [ ] Create `apps/api/src/middleware/error-handler.ts` — global error handler
4. [ ] Create `apps/api/src/middleware/logger.ts` — request logging middleware
5. [ ] Create `apps/api/src/routes/auth.ts` — login and me endpoints
6. [ ] Create `apps/api/src/routes/health.ts` — health check with DB and Redis ping
7. [ ] Create `apps/api/src/routes/templates.ts` — template listing from Remotion registry
8. [ ] Create `apps/api/src/server.ts` — Hono app with all middleware + routes
9. [ ] Verify: server starts, health endpoint responds, login returns JWT, protected routes require auth

## Details

### Config (`apps/api/src/config.ts`)

```typescript
import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3100),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('renderforge'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

### Auth Middleware (`apps/api/src/middleware/auth.ts`)

- Use `jose` library for JWT verification (HS256 algorithm)
- Extract Bearer token from Authorization header
- Verify token signature against `config.JWT_SECRET`
- Attach decoded user payload `{ id, email, role }` to Hono context via `c.set('user', payload)`
- Return 401 if no token, invalid token, or expired token
- Create a Hono middleware factory: `authMiddleware()` returns the middleware function
- Export a helper `requireAuth` that can be used as route-level middleware

```typescript
import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { config } from '../config';

type JWTPayload = { id: string; email: string; role: string };

export const authMiddleware = () => async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(config.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload as unknown as JWTPayload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};
```

### Error Handler (`apps/api/src/middleware/error-handler.ts`)

- Catch all errors in the Hono `onError` handler
- ZodError → 400 with formatted validation errors
- Custom `AuthError` → 401
- Custom `NotFoundError` → 404
- Everything else → 500 with generic message (log full error in dev)
- Always return JSON `{ error: string, details?: unknown }`

### Logger (`apps/api/src/middleware/logger.ts`)

- Log: `${method} ${path} ${status} ${duration}ms`
- Use `console.log` with timestamp prefix
- Record start time before `next()`, calculate duration after

### Auth Routes (`apps/api/src/routes/auth.ts`)

**POST /api/auth/login:**
- Accept `{ email: string, password: string }` (Zod validated)
- Query users table by email
- Verify password with `bcryptjs.compare()`
- Generate JWT with `jose.SignJWT` (payload: `{ id, email, role }`, expiresIn: '7d')
- Return `{ token, user: { id, email, name, role } }`

**GET /api/auth/me:** (protected)
- Return current user from context (set by auth middleware)
- Query fresh user data from DB using the user ID from JWT

### Health Route (`apps/api/src/routes/health.ts`)

**GET /health:** (public, no auth required)
- Ping PostgreSQL: `SELECT 1`
- Ping Redis: `redis.ping()`
- Return `{ status: 'ok', uptime: process.uptime(), db: 'connected', redis: 'connected', timestamp }`
- If DB or Redis fails, return partial status with errors

### Templates Route (`apps/api/src/routes/templates.ts`)

**GET /api/templates:** (protected)
- Import the Remotion template registry from `@renderforge/renderer`
- Return list of templates with: id, name, description, category, tags, supportedFormats, durationInFrames, fps

**GET /api/templates/:id:** (protected)
- Return single template details + defaultProps + schema (serialized Zod schema)

### Server Entry (`apps/api/src/server.ts`)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { templateRoutes } from './routes/templates';

const app = new Hono();

// Global middleware
app.use('*', cors({ origin: '*' }));
app.use('*', loggerMiddleware());
app.onError(errorHandler);

// Public routes
app.route('/', healthRoutes);
app.route('/api/auth', authRoutes);

// Protected routes
app.use('/api/*', authMiddleware());
app.route('/api/templates', templateRoutes);

const port = config.PORT;
console.log(`RenderForge API starting on port ${port}`);
serve({ fetch: app.fetch, port });
```

### Custom Error Classes

Create `apps/api/src/lib/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, message); }
}
export class AuthError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}
export class ValidationError extends AppError {
  constructor(message = 'Validation failed') { super(400, message); }
}
```

## Verification

1. `pnpm dev:api` starts server on port 3100
2. `curl http://localhost:3100/health` returns OK with DB and Redis status
3. `curl -X POST http://localhost:3100/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@renderforge.com","password":"admin123"}'` returns JWT token
4. `curl http://localhost:3100/api/auth/me -H "Authorization: Bearer <token>"` returns user info
5. `curl http://localhost:3100/api/templates -H "Authorization: Bearer <token>"` returns template list
6. Unauthenticated requests to `/api/*` return 401
7. Invalid JSON body returns 400 with validation errors
