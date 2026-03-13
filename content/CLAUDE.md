# Content Pipeline

Scripts for automated content generation, TTS audio, and batch rendering.

## Pipeline Flows

### Legacy (template-specific)
```
generate-plan.ts → generate-scripts.ts → [Colab TTS] → audio-sync.ts → render.ts → add-metadata.ts
```

### Universal (any niche)
```
Audio Files → audio-ingest.ts → manifest.json → render-manifest.ts → Final Video
                (ffprobe)          (timing)        (niche config)      (audio+video)
```

### Bucket Pipeline (end-to-end)
```
MinIO → storage.ts → audio-split.ts → audio-ingest.ts → render-manifest.ts → bgm-mix.ts → MinIO
         (download)     (split WAV)      (manifest)         (render)           (optional)   (upload)
```
Orchestrated by `render-from-bucket.ts`.

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `generate-plan.ts` | Generate 60-day content calendar | `npx tsx content/generate-plan.ts` |
| `generate-scripts.ts` | Extract audio scripts from plan | `npx tsx content/generate-scripts.ts` |
| `generate-kids-scripts.ts` | Kids content scripts (alphabet, counting, quiz, bedtime) | `npx tsx content/generate-kids-scripts.ts` |
| `audio-ingest.ts` | Universal audio → frame manifest | `npx tsx content/audio-ingest.ts --dir ./audio` |
| `render-manifest.ts` | Universal manifest → render video | `npx tsx content/render-manifest.ts --dir ./audio --niche kids-bedtime` |
| `audio-sync.ts` | Legacy template-specific sync + render | `npx tsx content/audio-sync.ts --post day01-post1` |
| `render.ts` | Batch render across formats | `npx tsx content/render.ts` |
| `add-metadata.ts` | Inject title/description metadata | `npx tsx content/add-metadata.ts` |
| `storage.ts` | MinIO/S3 client (download/upload/list) | `npx tsx content/storage.ts --list` |
| `audio-split.ts` | Split full.wav into segments via ffmpeg | `npx tsx content/audio-split.ts --dir content/audio/motivation1` |
| `bgm-mix.ts` | Mix background music into rendered video | `npx tsx content/bgm-mix.ts --video out.mp4 --bgm bgm.mp3` |
| `render-from-bucket.ts` | Full pipeline: MinIO → split → render → upload | `npx tsx content/render-from-bucket.ts --key motivation1.wav --niche motivational` |
| `generate-motivational.ts` | Generate 100 motivational scripts + splits.json | `npx tsx content/generate-motivational.ts` |
| `batch-render-motivational.ts` | Batch render all motivational posts | `npx tsx content/batch-render-motivational.ts --resume` |

## Universal Pipeline (New)

### audio-ingest.ts
Takes any directory of audio files, measures durations via ffprobe, outputs `manifest.json`:
```bash
npx tsx content/audio-ingest.ts --dir content/audio/my-project
npx tsx content/audio-ingest.ts --all  # process all subdirs
```

### render-manifest.ts
Reads manifest + niche config → maps audio timing to template props → renders → merges audio:
```bash
npx tsx content/render-manifest.ts --dir content/audio/my-project --niche kids-bedtime
npx tsx content/render-manifest.ts --dir ./audio --niche news --template breaking-news --format story
npx tsx content/render-manifest.ts --dir ./audio --niche motivational --sync-only
```

### Niche Definitions (niches.ts)
Maps content niches to templates, voices, and prop mappings:
- `kids-education` → alphabet, counting, quiz (voice: kids-cheerful)
- `kids-bedtime` → bedtime-story (voice: gentle-storyteller)
- `motivational` → yld-intro, slider (voice: les-brown)
- `news` → breaking-news, kinetic-text (voice: morgan-freeman)
- `how-to` → slider, split-reveal (voice: mel-robbins)
- `luxury` → dubai-luxury, showcase, gold-reveal (voice: denzel-washington)
- `sports` → match-fixture, post-match (voice: eric-thomas)

### Voice Registry (voices.json)
Unified voice definitions with reference audio paths, transcripts, and niche tags.
Used by both the TypeScript pipeline and the Colab TTS notebook.

## Motivational Batch Pipeline (100 TikTok Videos)

```
generate-motivational.ts → scripts-motivational.json + 100x splits.json
     ↓ (user runs Colab TTS, uploads full.wav to MinIO)
batch-render-motivational.ts → download → split → render → BGM → upload
```

### generate-motivational.ts
Generates 100 motivational posts (10 themes × 10 posts) with TTS scripts and render props:
```bash
npx tsx content/generate-motivational.ts              # all 100
npx tsx content/generate-motivational.ts --limit 5    # first 5
npx tsx content/generate-motivational.ts --dry-run    # preview only
```
- Output: `scripts-motivational.json` (for Colab TTS) + `content/audio/mot-XXX/splits.json` (render props)
- Themes: mindset, discipline, confidence, success, fear, hustle, leadership, resilience, purpose, money

### batch-render-motivational.ts
Batch orchestrator for rendering all posts after TTS audio is on MinIO:
```bash
npx tsx content/batch-render-motivational.ts                      # all
npx tsx content/batch-render-motivational.ts --start 1 --end 50   # range
npx tsx content/batch-render-motivational.ts --post mot-042       # single
npx tsx content/batch-render-motivational.ts --resume              # skip done
npx tsx content/batch-render-motivational.ts --local --skip-upload # local only
```
- Progress tracked in `batch-progress.json`
- Timestamps estimated from word count if Colab doesn't provide `timestamps.json`
- BGM rotates through 5 tracks in `content/audio/bgm/motivational/`
- MinIO convention: upload `full.wav` to `motivational/mot-XXX/full.wav`

## Legacy Audio Sync

`audio-sync.ts` workflow (still works for YLD/Slider/Kids):
1. Reads audio segments from `content/audio/{dayXX-postX}/`
2. Uses `ffprobe` to measure each segment's duration
3. Calculates frame timings: PAD_BEFORE (15f) + audio + PAD_AFTER (20f) + TRANSITION
4. Generates Remotion props with precise timing → `output/synced/synced-props.json`
5. Renders silent video via Remotion
6. Merges audio with `ffmpeg -c:v copy -c:a aac`

## TTS Generation

- `renderforge-tts.ipynb` — Google Colab notebook using Qwen3 TTS
- `voices.json` — unified voice registry (kids + motivational voices)
- `inputaudio/` — voice reference WAV files for TTS cloning
- Output audio files go to `content/audio/` subdirectories

## Content Plan

`content-plan.json` — 60-day calendar for the YLD (Your Last Dollar) channel targeting Ethiopian/Amharic audience with financial literacy content.
