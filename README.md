# 🎬 RenderForge

**Dynamic video template engine powered by [Remotion](https://remotion.dev)**

Generate stunning short-form videos from JSON config. Every template is a React component with full prop control — colors, text, images, timing, effects. Zero design skills needed.

---

## ✨ Features

- **3 Premium Templates** — Cinematic quality with particles, glitch effects, mesh gradients
- **5 Starter Templates** — Ready-to-use with registry system + themes
- **Multi-Format** — Story (9:16), Post (1:1), Landscape (16:9)
- **4 Themes** — Default, Dark, Vibrant, Minimal
- **Fully Configurable** — Every layer, color, text, timing adjustable via JSON props
- **CLI + API** — Render from command line or REST API
- **Type-Safe** — Full TypeScript + Zod schema validation

---

## 🚀 Quick Start

```bash
# Install
npm install

# Preview in browser (Remotion Studio)
npm run dev

# Render a video
npx remotion render src/index.ts <template-id> output.mp4
```

---

## 🎨 Premium Templates

### 1. YLD Intro (`yld-intro`)
Brand/channel intro with cinematic effects.

**Effects:** Floating particles, scan line, grid overlay, vignette, logo glow pulse
**Animations:** charReveal, wordReveal, typewriter, glitch, slideUp, fadeIn
**Duration:** 15s (450 frames @ 30fps)

```bash
npx remotion render src/index.ts yld-intro output.mp4 --props '{
  "logo": { "file": "my-logo.png", "size": 400 },
  "header": {
    "line1": "Introducing",
    "line2": "the future of work",
    "highlight": "future"
  },
  "subheader": { "text": "AI-powered. Human-centered." },
  "badge": { "text": "Coming Soon" },
  "theme": {
    "accentColor": "#3b82f6",
    "bgGradient": ["#1e1b4b", "#0f0d2e", "#050412"]
  }
}'
```

**Configurable layers:**
| Layer | Props |
|-------|-------|
| Logo | file, size, glow, finalScale, moveUpPx |
| Header | line1, line2, highlight, sizes, animations |
| Subheader | text, size, animation |
| Badge | text, enabled |
| CTA | text, enabled, bottomOffset |
| Divider | enabled |
| Theme | accentColor, bgGradient, particles/scanLine/grid/vignette toggles |
| Timing | Per-layer appear frame |

---

### 2. Showcase (`showcase`)
Product/app showcase with floating 3D hero image.

**Effects:** Mesh gradient blobs, constellation particles, 3D perspective tilt, shine sweep, glow pulse
**Duration:** 14s (420 frames @ 30fps)

```bash
npx remotion render src/index.ts showcase output.mp4 --props '{
  "hero": {
    "imageUrl": "https://example.com/app-screenshot.png",
    "rotateY": 12,
    "floatAmplitude": 15
  },
  "headline": {
    "line1": "Your Brand",
    "line2": "reimagined",
    "highlight": "reimagined"
  },
  "features": {
    "items": ["AI-Powered", "Real-time", "No-code"],
    "pillStyle": "glass"
  },
  "theme": {
    "accentColor": "#8B5CF6",
    "secondaryAccent": "#EC4899",
    "bgGradient": ["#13041f", "#0a0118", "#050010"]
  }
}'
```

**Configurable layers:**
| Layer | Props |
|-------|-------|
| Hero Image | imageUrl, width, height, borderRadius, rotateY, floatAmplitude, glowColor, shadow |
| Tagline | text, size, animation, enabled |
| Headline | line1, line2, highlight, sizes, animations |
| Description | text, size, animation |
| Feature Pills | items[], pillStyle (solid/outline/glass) |
| CTA | text, style (solid/outline/glow), enabled |
| Theme | accentColor, secondaryAccent, bgGradient, meshGradient/particles/grid/vignette toggles |

---

### 3. Countdown (`countdown`)
Event countdown with neon energy effects.

**Effects:** Energy rings (pulsing, rotating), aurora borealis bands, rising spark embers, neon glow
**Duration:** 13s (390 frames @ 30fps)

```bash
npx remotion render src/index.ts countdown output.mp4 --props '{
  "countdown": {
    "days": 5, "hours": 12, "minutes": 30, "seconds": 0,
    "cardStyle": "neon"
  },
  "eventName": {
    "line1": "Don'\''t miss",
    "line2": "the big reveal",
    "highlight": "big reveal"
  },
  "details": {
    "date": "March 15, 2025 · 10:00 AM",
    "location": "Dubai World Trade Centre"
  },
  "theme": {
    "accentColor": "#F59E0B",
    "secondaryAccent": "#EF4444",
    "bgGradient": ["#1a0a00", "#0d0500", "#050200"]
  }
}'
```

**Configurable layers:**
| Layer | Props |
|-------|-------|
| Title | text, size, animation |
| Countdown | days, hours, minutes, seconds, digitSize, cardStyle (flat/glass/neon/flip), separatorStyle (colon/dots/none) |
| Event Name | line1, line2, highlight, sizes, animations |
| Details | date, location, enabled |
| CTA | text, style (pill/underline/glow) |
| Theme | accentColor, secondaryAccent, bgGradient, energyRings/particles/aurora/vignette toggles |

---

## 📋 Starter Templates (Registry)

These templates use the theme/format system and support all 3 formats × 4 themes = 12 variants each.

| Template | ID | Description | Duration |
|----------|----|-------------|----------|
| Product Launch | `product-launch-{format}` | Multi-scene product showcase | 6s |
| Quote of the Day | `quote-of-day-{format}` | Elegant quote typography | 5s |
| Stats Recap | `stats-recap-{format}` | Animated counter grid | 6s |
| Testimonial | `testimonial-{format}` | Star rating + customer quote | 5s |
| Announcement | `announcement-{format}` | Bold headline + CTA | 5s |

```bash
# Render starter template with theme
npx remotion render src/index.ts product-launch-story output.mp4
npx remotion render src/index.ts quote-of-day-post output.mp4
```

---

## 🔧 CLI Reference

```bash
# List all compositions
npx remotion compositions src/index.ts

# Render with custom props
npx remotion render src/index.ts <composition-id> output.mp4 \
  --props '<json>'

# Using the render-cli script (starter templates only)
npm run render -- --template <id> --format <story|post|landscape> \
  --theme <default|dark|vibrant|minimal> \
  --props '<json>' \
  --output ./output/video.mp4
```

---

## 🌐 REST API

```bash
npm run api  # Starts on http://localhost:3100
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/templates` | GET | List all templates |
| `/api/templates/:id` | GET | Get template details |
| `/api/themes` | GET | List themes |
| `/api/render` | POST | Submit render job |
| `/api/render/:jobId` | GET | Check render status |

---

## 🏗 Architecture

```
src/
├── Root.tsx              # Registers all compositions
├── types.ts              # Core types (Theme, Format, etc.)
├── core/                 # Registry, schemas, fonts, format helpers
├── components/           # Shared: AnimatedText, Background, CTA, Logo, transitions
├── templates/
│   ├── yld-intro/        # Premium: brand intro
│   ├── showcase/         # Premium: product showcase
│   ├── countdown/        # Premium: event countdown
│   ├── product-launch/   # Starter: product promo
│   ├── quote-of-day/     # Starter: quote card
│   ├── stats-recap/      # Starter: number counters
│   ├── testimonial/      # Starter: customer review
│   └── announcement/     # Starter: headline + CTA
├── themes/               # default, dark, vibrant, minimal
└── api/                  # Express REST server
```

### Text Animations

All premium templates share these animation types:

| Animation | Effect |
|-----------|--------|
| `charReveal` | Each character fades/scales in with stagger |
| `typewriter` | Characters appear one by one with blinking cursor |
| `glitch` | Text flickers with cyan/red ghosts |
| `slideUp` | Slides up from below with spring physics |
| `fadeIn` | Simple opacity fade |
| `wordReveal` | Each word fades in separately (YLD only) |

---

## 📦 Docker

```bash
docker build -t renderforge .
docker run -p 3100:3100 renderforge
```

---

## 📄 License

MIT
