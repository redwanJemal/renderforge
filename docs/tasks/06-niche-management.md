# Task 06: Niche Management API

## Overview

Create CRUD API for managing content niches (e.g., motivational, stoic, YLD financial literacy). Migrate static niche definitions from `content/niches.ts` to be database-driven.

## Subtasks

1. [ ] Create `apps/api/src/services/niche.ts` — CRUD service: list(pagination), getById, getBySlug, create, update, delete
2. [ ] Create `apps/api/src/routes/niches.ts` — RESTful routes for niches
3. [ ] Migrate static niche definitions from `content/niches.ts` to be seedable into DB
4. [ ] Verify: CRUD operations work, niches seed correctly

## Details

### Niche Service (`apps/api/src/services/niche.ts`)

```typescript
import { db, niches } from '@renderforge/db';
import { eq, ilike, sql } from 'drizzle-orm';

type CreateNicheInput = {
  slug: string;
  name: string;
  defaultTemplateId?: string;
  voiceId?: string;
  languages?: string[];
  config?: Record<string, unknown>;
};

type UpdateNicheInput = Partial<CreateNicheInput>;

type ListOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export const nicheService = {
  async list(options: ListOptions = {}) {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let query = db.select().from(niches);

    if (search) {
      query = query.where(ilike(niches.name, `%${search}%`));
    }

    const [items, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(niches.name),
      db.select({ count: sql<number>`count(*)` }).from(niches),
    ]);

    return {
      items,
      total: Number(countResult[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    };
  },

  async getById(id: string) {
    const [niche] = await db.select().from(niches).where(eq(niches.id, id));
    return niche || null;
  },

  async getBySlug(slug: string) {
    const [niche] = await db.select().from(niches).where(eq(niches.slug, slug));
    return niche || null;
  },

  async create(input: CreateNicheInput) {
    const [niche] = await db.insert(niches).values(input).returning();
    return niche;
  },

  async update(id: string, input: UpdateNicheInput) {
    const [niche] = await db.update(niches)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(niches.id, id))
      .returning();
    return niche || null;
  },

  async delete(id: string) {
    const [niche] = await db.delete(niches).where(eq(niches.id, id)).returning();
    return niche || null;
  },
};
```

### Routes (`apps/api/src/routes/niches.ts`)

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { nicheService } from '../services/niche';

const nicheRoutes = new Hono();

const createNicheSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  defaultTemplateId: z.string().optional(),
  voiceId: z.string().optional(),
  languages: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

const updateNicheSchema = createNicheSchema.partial();

// GET /api/niches — list with pagination and search
nicheRoutes.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search');
  const result = await nicheService.list({ page, limit, search });
  return c.json(result);
});

// GET /api/niches/:id — get by ID
nicheRoutes.get('/:id', async (c) => {
  const niche = await nicheService.getById(c.req.param('id'));
  if (!niche) return c.json({ error: 'Niche not found' }, 404);
  return c.json(niche);
});

// POST /api/niches — create
nicheRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createNicheSchema.parse(body);

  // Check slug uniqueness
  const existing = await nicheService.getBySlug(data.slug);
  if (existing) return c.json({ error: 'Slug already exists' }, 409);

  const niche = await nicheService.create(data);
  return c.json(niche, 201);
});

// PUT /api/niches/:id — update
nicheRoutes.put('/:id', async (c) => {
  const body = await c.req.json();
  const data = updateNicheSchema.parse(body);
  const niche = await nicheService.update(c.req.param('id'), data);
  if (!niche) return c.json({ error: 'Niche not found' }, 404);
  return c.json(niche);
});

// DELETE /api/niches/:id — delete
nicheRoutes.delete('/:id', async (c) => {
  const niche = await nicheService.delete(c.req.param('id'));
  if (!niche) return c.json({ error: 'Niche not found' }, 404);
  return c.json({ message: 'Deleted', niche });
});

export { nicheRoutes };
```

### Server Integration

Add to `apps/api/src/server.ts`:
```typescript
import { nicheRoutes } from './routes/niches';
app.route('/api/niches', nicheRoutes);
```

### Niche Config Structure

The `config` JSONB field stores niche-specific configuration matching the existing `NicheConfig` pattern from `content/niches.ts`:

```typescript
{
  segmentPatterns: { intro: '...', hook: '...', ... },
  propMappings: { scene_intro: { ... } },
  defaultTheme: 'dark',
  defaultFormat: 'story',
  bgmCategory: 'motivational',
}
```

## Verification

1. `GET /api/niches` returns paginated list of niches
2. `POST /api/niches` creates a new niche with validation
3. `GET /api/niches/:id` returns a single niche
4. `PUT /api/niches/:id` updates niche fields
5. `DELETE /api/niches/:id` removes niche
6. Slug uniqueness is enforced (409 on duplicate)
7. Search works: `GET /api/niches?search=motiv`
8. Pagination works: `GET /api/niches?page=2&limit=5`
9. Seeded niches from `content/niches.ts` are accessible via API
