# 🎬 RenderForge

Dynamic video template engine powered by [Remotion](https://remotion.dev). Create stunning promotional videos with customizable templates.

## ✨ Features

- 🎨 **20+ Premium Templates** — Product launches, countdowns, sports, luxury themes
- 🇪🇹 **Amharic/Ethiopic Support** — Full Noto Sans Ethiopic font integration
- 🌍 **Multi-language** — Arabic, Amharic, English, and more
- 📐 **Multiple Formats** — Story (1080x1920), YouTube (1920x1080), Square (1080x1080)
- ⚡ **CLI Rendering** — Generate videos from command line with JSON props

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start Remotion Studio (preview templates)
npm run dev

# Render a video
npx remotion render <template-id> --props='<json>' --output-location=output.mp4
```

---

## 📦 Available Templates

### 🎯 General Purpose

| Template | ID | Description |
|----------|-----|-------------|
| **Showcase** | `showcase` | Product/app showcase with floating hero image |
| **Countdown** | `countdown` | Event countdown with animated timer |
| **Announcement** | `announcement-story` | Simple announcement with text animations |
| **Product Launch** | `product-launch-story` | Product reveal with features |
| **Quote of Day** | `quote-story` | Inspirational quotes with attribution |
| **Testimonial** | `testimonial-story` | Customer testimonial cards |
| **Stats Recap** | `stats-story` | Animated statistics display |

### ✨ Premium Effects

| Template | ID | Description |
|----------|-----|-------------|
| **Kinetic Text** | `kinetic-text` | Dynamic typography animations |
| **Split Reveal** | `split-reveal` | Split-screen reveal effect |
| **Glitch Text** | `glitch-text` | Cyberpunk glitch typography |
| **Neon Glow** | `neon-glow` | Neon sign effect with glow |
| **Orbit** | `orbit` | Circular orbiting elements |
| **Parallax Layers** | `parallax-layers` | Multi-layer parallax depth |
| **Gold Reveal** | `gold-reveal` | Luxury gold text reveal |

### ⚽ Sports

| Template | ID | Description |
|----------|-----|-------------|
| **Match Fixture** | `match-fixture` | Upcoming match announcement |
| **Post Match** | `post-match` | Match results with stats |
| **Breaking News** | `breaking-news` | Sports news ticker style |

### 🌙 Special Occasions

| Template | ID | Description |
|----------|-----|-------------|
| **Ramadan Greeting** | `ramadan-greeting` | Islamic greeting with mosque |
| **Dubai Luxury** | `dubai-luxury` | UAE/Gulf luxury theme |
| **YLD Intro** | `yld-intro` | Your Last Dollar branded intro |

---

## 📝 Example Commands

### Showcase (Amharic - ገበያ)

```bash
npx remotion render showcase --props='{
  "hero": {
    "imageUrl": "https://example.com/product.jpg",
    "width": 600,
    "height": 400,
    "glowColor": "#10B981"
  },
  "tagline": {"text": "አዲስ", "enabled": true},
  "headline": {
    "line1": "ገበያ",
    "line2": "ለኢትዮጵያውያን",
    "highlight": "ገበያ"
  },
  "description": {"text": "ግዙ። ሽጡ። በቀላሉ።"},
  "features": {"items": ["ፈጣን", "ደህንነት", "ነፃ"], "pillStyle": "glass"},
  "theme": {
    "accentColor": "#10B981",
    "bgGradient": ["#064E3B", "#022C22", "#011614"]
  }
}' --width=1080 --height=1920 --output-location=output/gebeya.mp4
```

### Countdown (Ramadan)

```bash
npx remotion render countdown --props='{
  "title": {"text": "ለታላቁ የረመዳን ወር"},
  "countdown": {"days": 10, "hours": 0, "minutes": 0, "seconds": 0, "cardStyle": "neon"},
  "eventName": {
    "line1": "ረመዳን ከሪም",
    "line2": "የቀሩት ቀናት",
    "highlight": "ረመዳን"
  },
  "details": {"date": "Feb 28, 2026", "location": "Ethiopia", "enabled": true},
  "cta": {"text": "اللهم بلغنا رمضان", "enabled": true, "style": "glow"},
  "theme": {
    "accentColor": "#D4AF37",
    "secondaryAccent": "#10B981",
    "bgGradient": ["#052e16", "#022c22", "#000000"]
  }
}' --width=1080 --height=1920 --output-location=output/ramadan-countdown.mp4
```

### YouTube Format (1920x1080)

```bash
npx remotion render showcase --props='{...}' --width=1920 --height=1080 --output-location=youtube.mp4
```

### Square Format (1080x1080)

```bash
npx remotion render showcase --props='{...}' --width=1080 --height=1080 --output-location=square.mp4
```

---

## 🎨 Theme Customization

All templates support theme customization:

```json
{
  "theme": {
    "accentColor": "#10B981",      // Primary accent color
    "secondaryAccent": "#D4AF37",  // Secondary accent
    "bgGradient": ["#064E3B", "#022C22", "#011614"],  // Background gradient
    "particlesEnabled": true,      // Floating particles
    "meshGradientEnabled": true,   // Animated mesh blobs
    "gridEnabled": false,          // Background grid
    "vignetteEnabled": true        // Edge vignette
  }
}
```

---

## 🌐 Language Support

### Amharic (አማርኛ)
Noto Sans Ethiopic is loaded automatically. Just use Amharic text in your props:

```json
{
  "headline": {
    "line1": "ገበያ",
    "line2": "ለኢትዮጵያውያን"
  }
}
```

### Arabic (العربية)
Arabic text is supported with right-to-left rendering:

```json
{
  "tagline": {"text": "رمضان كريم"}
}
```

---

## 📁 Project Structure

```
renderforge/
├── src/
│   ├── Root.tsx              # Composition definitions
│   ├── core/
│   │   ├── fonts.ts          # Font loading utilities
│   │   ├── registry.ts       # Template registry
│   │   └── formats.ts        # Video format definitions
│   ├── templates/
│   │   ├── showcase/         # Showcase template
│   │   ├── countdown/        # Countdown template
│   │   ├── kinetic-text/     # Kinetic typography
│   │   └── ...               # Other templates
│   └── themes/               # Theme presets
├── public/
│   └── fonts/                # Custom fonts
├── output/                   # Rendered videos
└── remotion.config.ts        # Remotion configuration
```

---

## 🔧 Development

```bash
# Preview in browser
npm run dev

# Type check
npx tsc --noEmit

# Render with verbose output
npx remotion render showcase --log=verbose
```

---

## 📄 License

MIT

---

Made with ❤️ using [Remotion](https://remotion.dev)
