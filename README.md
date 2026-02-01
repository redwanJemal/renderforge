# 🎬 RenderForge

**Dynamic video template engine powered by [Remotion](https://remotion.dev)**

RenderForge is a configurable video generation platform where templates are React components registered with schemas. Users provide JSON config → get rendered video. Supports multiple formats, themes, and an API for SaaS delivery.

---

## ✨ Features

- **5 Starter Templates** — Product Launch, Quote of the Day, Stats Recap, Testimonial, Announcement
- **Multi-Format** — Story (9:16), Post (1:1), Landscape (16:9)
- **4 Themes** — Default, Dark, Vibrant, Minimal
- **Schema Validation** — Every template has a Zod schema with defaults
- **REST API** — Express server for template listing, theme browsing, and render submission
- **CLI** — Render videos from the command line
- **Type-Safe** — Full TypeScript, Zod schemas match types
- **Format-Responsive** — Components adapt layout based on format
- **Default-Rich** — Every template renders beautifully with zero config

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Chrome/Chromium (for Remotion rendering)

### Install

```bash
cd renderforge
npm install
```

### Launch Remotion Studio

Preview templates in the browser:

```bash
npm run dev
```

This opens Remotion Studio at `http://localhost:3000` where you can preview all template × format combinations interactively.

### Render from CLI

```bash
# Default render
npm run render -- --template product-launch --format landscape

# With custom props
npm run render -- --template quote-of-day --props '{"quote":"Stay hungry, stay foolish","author":"Steve Jobs"}' --theme dark --format story

# From a JSON file
npm run render -- --template stats-recap --props ./my-stats.json --output ./output/recap.mp4

# List templates
npm run render -- --list
```

### Start API Server

```bash
npm run api
# Server runs on http://localhost:3100
```

## 📋 API Reference

### Health Check

```
GET /health
```

### List Templates

```
GET /api/templates
```

Returns all registered templates with metadata and default props.

### Get Template

```
GET /api/templates/:id
```

### List Themes

```
GET /api/themes
```

### Submit Render

```
POST /api/render
Content-Type: application/json

{
  "templateId": "product-launch",
  "props": {
    "productName": "My Awesome Product",
    "price": "$49"
  },
  "theme": "dark",
  "format": "story",
  "outputFormat": "mp4"
}
```

Returns `202 Accepted` with a `jobId`.

### Check Render Status

```
GET /api/render/:jobId
```

Returns job status: `queued` → `rendering` (with progress %) → `complete` / `failed`.

## 🎨 Templates

### Product Launch
Showcase a product with image, name, price, discount badge, and CTA.
- **Scenes:** Brand intro → Product reveal → Features → CTA
- **Best for:** E-commerce, product announcements

### Quote of the Day
Elegant animated quote with author attribution and gradient background.
- **Best for:** Social media, inspiration content

### Stats Recap
Animated counter numbers with labels in a grid layout.
- **Best for:** Year-in-review, milestones, performance highlights

### Testimonial
Customer photo, quote, star rating, and company branding.
- **Best for:** Social proof, reviews, case studies

### Announcement
Bold headline with subtitle, date, details, and CTA.
- **Best for:** Event announcements, product launches, news

## 🎭 Themes

| Theme | Style | Best For |
|-------|-------|----------|
| `default` | Clean white/blue | Professional, corporate |
| `dark` | Dark with neon accents | Tech, gaming, modern |
| `vibrant` | Bold, colorful | Social media, youth |
| `minimal` | B&W, elegant typography | Premium, luxury |

## 🏗 Architecture

```
src/
├── Root.tsx              # Remotion entry - registers all compositions
├── types.ts              # Core TypeScript types
├── core/
│   ├── registry.ts       # Template registry (singleton)
│   ├── schema.ts         # Shared Zod schemas
│   ├── fonts.ts          # Font loading utilities
│   └── formats.ts        # Format dimensions & helpers
├── components/           # Shared UI building blocks
│   ├── AnimatedText      # Text with 6 animation types
│   ├── AnimatedImage     # Image with graceful fallback
│   ├── Background        # Solid/gradient/image backgrounds
│   ├── Logo              # Positioned logo component
│   ├── CTA               # Animated call-to-action
│   ├── Overlay           # Color/gradient overlay
│   └── transitions/      # FadeIn, SlideIn, ScaleIn
├── templates/            # Each template: index.tsx + schema.ts + meta.ts
├── themes/               # 4 theme definitions
└── api/                  # Express REST API
```

### How Templates Work

1. Each template is a directory with 3 files:
   - `meta.ts` — Metadata (id, name, formats, duration, fps)
   - `schema.ts` — Zod schema with defaults
   - `index.tsx` — React component + `registry.register()`

2. Templates self-register via side-effect imports in `Root.tsx`

3. `Root.tsx` reads the registry and creates `<Composition>` for each template × format combination

4. The API/CLI validates props against the schema before rendering

## 🔧 Creating a New Template

```bash
mkdir src/templates/my-template
```

**`meta.ts`:**
```typescript
import { TemplateMeta } from '../../types';

export const meta: TemplateMeta = {
  id: 'my-template',
  name: 'My Template',
  description: 'A custom template',
  category: 'custom',
  tags: ['custom'],
  supportedFormats: ['story', 'post', 'landscape'],
  durationInFrames: 150,
  fps: 30,
};
```

**`schema.ts`:**
```typescript
import { z } from 'zod';

export const myTemplateSchema = z.object({
  title: z.string().default('Hello World'),
  subtitle: z.string().default('This is my template'),
});

export type MyTemplateProps = z.infer<typeof myTemplateSchema>;
export const defaultProps: MyTemplateProps = myTemplateSchema.parse({});
```

**`index.tsx`:**
```typescript
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme, Format } from '../../types';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { myTemplateSchema, defaultProps } from './schema';
import type { MyTemplateProps } from './schema';

const MyTemplate: React.FC<MyTemplateProps & { theme: Theme; format: Format }> = ({
  title, subtitle, theme, format,
}) => (
  <AbsoluteFill style={{ background: theme.colors.background }}>
    {/* Your template content */}
  </AbsoluteFill>
);

registry.register({ meta, schema: myTemplateSchema, component: MyTemplate, defaultProps });
export default MyTemplate;
```

Then add `import './templates/my-template'` to `Root.tsx` and the API server.

## 📦 Production

### Queue-Based Rendering

For production, install BullMQ for Redis-backed render queues:

```bash
npm install bullmq ioredis
```

See `src/api/queue.ts` for the queue implementation.

### Docker

```dockerfile
FROM node:18-slim
RUN apt-get update && apt-get install -y chromium
WORKDIR /app
COPY . .
RUN npm ci
EXPOSE 3100
CMD ["npm", "run", "api"]
```

## 📄 License

MIT
