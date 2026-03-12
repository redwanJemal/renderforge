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
