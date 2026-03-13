# Content Pipeline

Multi-niche video content generation pipeline. Supports any niche with TTS audio → rendered video.

## Pipeline Flow

```
generate-content.ts → scripts-{niche}.json + splits.json per post
     ↓ (user runs Colab TTS with Qwen3, uploads full.wav to MinIO)
batch-render.ts → download → split → manifest → render → BGM → upload
```

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `generate-content.ts` | Generate TTS scripts + splits.json for any niche | `npx tsx content/generate-content.ts --niche motivational` |
| `batch-render.ts` | Batch render for any niche (or single post) | `npx tsx content/batch-render.ts --niche motivational --resume` |
| `audio-ingest.ts` | Audio files → frame manifest | `npx tsx content/audio-ingest.ts --dir ./audio` |
| `render-manifest.ts` | Manifest → rendered video | `npx tsx content/render-manifest.ts --dir ./audio --niche motivational` |
| `storage.ts` | MinIO/S3 client (download/upload/list) | `npx tsx content/storage.ts --list` |
| `audio-split.ts` | Split full.wav into segments via ffmpeg | `npx tsx content/audio-split.ts --dir content/audio/mot-001` |
| `bgm-mix.ts` | Mix background music into rendered video | `npx tsx content/bgm-mix.ts --video out.mp4 --bgm bgm.mp3` |
| `add-metadata.ts` | Inject title/description metadata | `npx tsx content/add-metadata.ts` |

## Content Generation

```bash
npx tsx content/generate-content.ts --list                         # list all niches
npx tsx content/generate-content.ts --niche motivational           # all 100 posts
npx tsx content/generate-content.ts --niche motivational --limit 5 # first 5
npx tsx content/generate-content.ts --niche motivational --theme mindset
npx tsx content/generate-content.ts --niche jokes --dry-run
```

Output: `scripts-{niche}.json` (for Colab TTS) + `content/audio/{prefix}-XXX/splits.json` (render props)

## Batch Rendering

```bash
npx tsx content/batch-render.ts --niche motivational                  # all
npx tsx content/batch-render.ts --niche motivational --start 1 --end 50
npx tsx content/batch-render.ts --niche motivational --post mot-042
npx tsx content/batch-render.ts --niche motivational --resume         # skip done
npx tsx content/batch-render.ts --niche motivational --local --skip-upload

# Single-post mode (ad-hoc)
npx tsx content/batch-render.ts --niche motivational --key audio/mot-001.wav
npx tsx content/batch-render.ts --niche motivational --local content/audio/mot-001
```

Progress tracked in `batch-progress-{niche}.json`.

## Content Banks (`banks/`)

Each niche has a content bank that owns the raw text and template-specific props:

| Bank | Posts | Themes | Status |
|------|-------|--------|--------|
| `banks/motivational.ts` | 100 | 10 (mindset, discipline, confidence, success, fear, hustle, leadership, resilience, purpose, money) | Ready |
| `banks/jokes.ts` | 0 | 5 (observational, one-liners, dark-humor, wordplay, relatable) | Stub |
| `banks/how-to.ts` | 0 | 5 (productivity, tech, money, health, social-media) | Stub |
| `banks/news.ts` | 0 | 5 (tech, science, world, business, ai) | Stub |

Add new niches by creating a bank in `banks/` implementing `ContentBank` from `banks/types.ts`, then registering it in `banks/index.ts`.

## Niche Definitions (`niches.ts`)

Maps niches to templates, voices, formats, and prop mappings:

| Niche | Template | Voice | Formats | Languages |
|-------|----------|-------|---------|-----------|
| `motivational` | motivational-narration | les-brown | story | en, es, pt, fr, de |
| `jokes` | motivational-narration | les-brown | story | en, es, pt, fr, de, it, ja, ko, ru, zh |
| `finance` | motivational-narration | les-brown | story | en, es, pt, fr, de |
| `kids-education` | kids-alphabet-adventure | kids-cheerful | landscape | en |
| `kids-bedtime` | kids-bedtime-story | gentle-storyteller | landscape | en |
| `news` | breaking-news | morgan-freeman | story | en, es, pt, fr, de, it |
| `how-to` | slider | mel-robbins | landscape | en, es, de, fr |
| `luxury` | dubai-luxury | denzel-washington | story | en, es, fr, it, pt |
| `sports` | match-fixture | eric-thomas | story | en, es, pt, fr |

## Qwen3 TTS Languages

Supported: **English, Chinese, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian**
Features: 3-second voice cloning, emotion/prosody control, streaming (97ms latency)

## TTS Generation

- `renderforge-tts.ipynb` — Google Colab notebook using Qwen3 TTS
- `voices.json` — unified voice registry
- `inputaudio/` — voice reference WAV files for TTS cloning
- MinIO convention: upload `full.wav` to `{storagePrefix}/{postId}.wav`

## Utility Modules (internal)

- `audio-ingest.ts` — ffprobe-based manifest generation (segment durations → frame timing)
- `render-manifest.ts` — niche config → template prop mapping → Remotion render → ffmpeg merge
- `audio-split.ts` — ffmpeg split of full.wav using splits.json timestamps
- `bgm-mix.ts` — ffmpeg BGM mixing with fade-out
- `storage.ts` — MinIO S3 download/upload/list
- `niches.ts` — niche → template → prop mapping definitions
