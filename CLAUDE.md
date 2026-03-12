# RenderForge

Dynamic video template engine powered by Remotion for programmatic social media video generation.

## Quick Reference

```bash
npm run dev          # Remotion Studio → http://localhost:3000
npm run api          # Express API → http://localhost:3100
npm run render       # CLI render (tsx scripts/render-cli.ts)
cd dashboard && npm run dev  # Dashboard → http://localhost:5173
```

## Architecture

- **Rendering**: Remotion 4.0.415 (React → Chromium frames → ffmpeg → MP4)
- **API**: Express.js on port 3100 (render jobs, preview, template listing)
- **Dashboard**: React + Vite SPA served by Express in production
- **Audio Pipeline**: ffprobe for timing → Remotion render → ffmpeg audio merge

## Project Structure

```
src/
  core/          # Registry, schemas (Zod), fonts, format configs
  types.ts       # Theme, TemplateMeta, Format, RenderJob
  components/    # AnimatedText, AnimatedImage, Background, CTA, Logo, Overlay
  templates/     # 23 templates (each: index.tsx with component + registry.register())
  themes/        # default, dark, vibrant, minimal
  api/           # Express server + routes (health, templates, render, preview)
  Root.tsx       # Remotion composition entry (registers all template×format combos)
scripts/
  render-cli.ts  # CLI interface for rendering
content/
  audio-sync.ts  # Audio-synced render pipeline (ffprobe + frame timing)
  generate-plan.ts    # 60-day content calendar generator
  generate-scripts.ts # Extract audio scripts from content plan
  render.ts           # Batch render pipeline
  renderforge-tts.ipynb  # Colab notebook for Qwen3 TTS
dashboard/       # React Vite SPA (template gallery, preview, config, render)
```

## Key Patterns

### Template Registration
Every template in `src/templates/{name}/index.tsx` follows:
```typescript
registry.register({
  meta: { id, name, description, category, tags, supportedFormats, durationInFrames, fps },
  schema: zodSchema,
  component: MyTemplate,
  defaultProps: {...}
});
```

### Output Formats
- **story**: 1080×1920 (9:16 portrait)
- **post**: 1080×1080 (1:1 square)
- **landscape**: 1920×1080 (16:9 widescreen)

### Themes
All templates accept `theme: Theme` with colors (primary, secondary, accent, background, text, muted) and fonts (heading, body).

## Conventions

- TypeScript strict mode, React 18 with JSX transform
- Zod for all prop validation schemas
- Animations use Remotion's `interpolate()` and `spring()` — frame-based, not time-based
- Font loading via `src/core/fonts.ts` (Google Fonts + local Noto Sans Ethiopic)
- Multi-language support: English, Amharic (Ethiopic), Arabic
- Output goes to `output/` directory (gitignored except samples in `out/`)
- Docker build uses Node 22 + Chromium + ffmpeg

## System Dependencies (for rendering)

- Node.js 22+
- Chromium (headless, for Remotion frame capture)
- ffmpeg + ffprobe (video encoding, audio analysis)

## Content Pipeline (YLD Channel)

1. `generate-plan.ts` → 60-day content calendar (`content-plan.json`)
2. `generate-scripts.ts` → audio scripts per post
3. Colab notebook → Qwen3 TTS audio generation
4. `audio-sync.ts` → frame-synced video with narration
5. `render.ts` → batch render all formats
6. `add-metadata.ts` → inject video metadata
