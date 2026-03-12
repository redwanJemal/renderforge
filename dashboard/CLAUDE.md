# RenderForge Dashboard

React + Vite SPA for template preview, configuration, and video rendering.

## Setup

```bash
npm install
npm run dev    # Dev server on http://localhost:5173 (proxies API to :3100)
npm run build  # Production build → dist/ (served by Express API)
```

## Structure

```
src/
  App.tsx              # Main layout with template gallery + config panel
  api.ts               # HTTP client for Express API (/api/templates, /api/render, etc.)
  types.ts             # Shared types (mirrors src/types.ts)
  hooks/
    useTemplates.ts    # Fetch & cache template list
    useRender.ts       # Submit render job + poll progress
  components/
    TemplateGallery.tsx  # Grid of template cards
    PreviewPanel.tsx     # Live single-frame preview (via /api/preview)
    ConfigPanel.tsx      # Dynamic form built from template Zod schema
    FieldRenderer.tsx    # Renders form fields based on schema type
    FormatSelector.tsx   # story/post/landscape toggle
    ThemeSelector.tsx    # Theme picker
    RenderButton.tsx     # Submit + progress indicator
    Layout.tsx           # Page layout wrapper
```

## API Integration

All API calls go through `api.ts`. The Express server at port 3100 handles:
- `GET /api/templates` — list templates with schemas
- `GET /api/preview?templateId=...&format=...&theme=...&props=...` — PNG frame
- `POST /api/render` — start render job
- `GET /api/render/:jobId` — poll progress

## Conventions

- Vite config proxies `/api` to Express backend in dev mode
- No state management library — React hooks + props
- Template schemas drive the config form dynamically via FieldRenderer
