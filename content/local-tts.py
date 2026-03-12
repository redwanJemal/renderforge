#!/usr/bin/env python3
"""
Local TTS Generator — CPU-friendly audio generation

Uses Piper TTS (ONNX, ~100MB RAM, 8x realtime) for fast local generation.
Piper produces clear, natural English speech — ideal for faceless video narration.

Usage:
  python3 content/local-tts.py --text "Hello kids!" --output audio/test.wav
  python3 content/local-tts.py --text "Once upon a time..." --voice amy --output audio/story.wav
  python3 content/local-tts.py --scripts content/kids-scripts.json --limit 1
  python3 content/local-tts.py --list-voices

Available voices:
  amy     — Female, clear, warm (default)
  lessac  — Male, professional, narrator
  bryce   — Male, warm, conversational

For Qwen3 TTS voice cloning (needs GPU or 8GB+ free RAM):
  Use the Google Colab notebook: content/renderforge-tts.ipynb
"""

import argparse
import json
import os
import sys
import time
import urllib.request

import numpy as np
import soundfile as sf

# ──────────────────────────────────────────────
# VOICE DEFINITIONS
# ──────────────────────────────────────────────

PIPER_VOICES = {
    "amy": {
        "name": "Amy (Female, warm)",
        "model": "en_US-amy-medium",
        "url_base": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium",
    },
    "lessac": {
        "name": "Lessac (Male, narrator)",
        "model": "en_US-lessac-medium",
        "url_base": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium",
    },
    "bryce": {
        "name": "Bryce (Male, warm)",
        "model": "en_US-bryce-medium",
        "url_base": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/bryce/medium",
    },
}

VOICE_DIR = os.path.expanduser("~/.local/share/piper")

# ──────────────────────────────────────────────
# VOICE MANAGEMENT
# ──────────────────────────────────────────────

def ensure_voice(voice_id: str) -> str:
    """Download voice model if not cached. Returns model path."""
    voice = PIPER_VOICES[voice_id]
    model_name = voice["model"]
    model_path = os.path.join(VOICE_DIR, f"{model_name}.onnx")
    config_path = f"{model_path}.json"

    if not os.path.exists(model_path):
        os.makedirs(VOICE_DIR, exist_ok=True)
        url_base = voice["url_base"]
        print(f"  Downloading voice: {voice['name']}...")
        urllib.request.urlretrieve(f"{url_base}/{model_name}.onnx", model_path)
        urllib.request.urlretrieve(f"{url_base}/{model_name}.onnx.json", config_path)
        print(f"  Downloaded → {model_path}")

    return model_path


def load_voice(voice_id: str):
    """Load a Piper voice model."""
    from piper import PiperVoice
    model_path = ensure_voice(voice_id)
    return PiperVoice.load(model_path)


# ──────────────────────────────────────────────
# TTS GENERATION
# ──────────────────────────────────────────────

def generate_speech(voice, text: str, output_path: str) -> float:
    """Generate speech audio. Returns duration in seconds."""
    start = time.time()

    chunks = list(voice.synthesize(text))
    audio = np.concatenate([c.audio_float_array for c in chunks])
    sr = chunks[0].sample_rate

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    sf.write(output_path, audio, sr)

    elapsed = time.time() - start
    duration = len(audio) / sr
    speed = duration / elapsed if elapsed > 0 else 0

    print(f"    {duration:.1f}s audio in {elapsed:.1f}s ({speed:.1f}x RT) → {os.path.basename(output_path)}")
    return duration


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Local TTS with Piper (CPU)")
    parser.add_argument("--text", help="Text to synthesize")
    parser.add_argument("--voice", default="amy", choices=PIPER_VOICES.keys(), help="Voice (default: amy)")
    parser.add_argument("--output", "-o", default="output/tts-test.wav", help="Output WAV path")
    parser.add_argument("--scripts", help="Path to scripts JSON (batch mode)")
    parser.add_argument("--limit", type=int, default=0, help="Limit scripts to process")
    parser.add_argument("--list-voices", action="store_true", help="List available voices")

    args = parser.parse_args()

    if args.list_voices:
        print("Available voices:")
        for vid, v in PIPER_VOICES.items():
            cached = "cached" if os.path.exists(os.path.join(VOICE_DIR, f"{v['model']}.onnx")) else "not downloaded"
            print(f"  {vid:12s} {v['name']:30s} ({cached})")
        return

    # Load voice
    print(f"Loading voice: {PIPER_VOICES[args.voice]['name']}")
    voice = load_voice(args.voice)

    # Single text mode
    if args.text:
        print(f"Generating: \"{args.text[:80]}{'...' if len(args.text) > 80 else ''}\"")
        duration = generate_speech(voice, args.text, args.output)
        print(f"\nDone! {duration:.1f}s → {args.output}")
        return

    # Batch scripts mode
    if args.scripts:
        with open(args.scripts) as f:
            scripts = json.load(f)

        if args.limit:
            scripts = scripts[:args.limit]

        total_sections = sum(len(s["sections"]) for s in scripts)
        print(f"\nBatch: {len(scripts)} scripts, {total_sections} audio files")
        print("=" * 60)

        done = 0
        total_duration = 0.0
        total_start = time.time()

        for script in scripts:
            post_id = script["postId"]
            audio_dir = os.path.join("content", "audio", post_id)
            os.makedirs(audio_dir, exist_ok=True)

            print(f"\n[{post_id}] {script['template']} — {script['title'][:50]}")

            post_wavs = []
            post_sr = None

            for section in script["sections"]:
                done += 1
                elapsed = time.time() - total_start
                per_item = elapsed / done if done > 0 else 0
                eta = per_item * (total_sections - done)
                eta_str = f"{int(eta // 60)}m{int(eta % 60)}s" if eta > 60 else f"{int(eta)}s"

                output_path = os.path.join("content", "audio", section["audioFile"])
                text = section["text"]

                print(f"  [{done}/{total_sections}] {section['key']} (ETA: {eta_str})")

                duration = generate_speech(voice, text, output_path)
                total_duration += duration

                wav_data, sr = sf.read(output_path)
                post_wavs.append(wav_data)
                post_sr = sr

            # Combine into full narration with pauses
            if post_wavs and post_sr:
                pause = np.zeros(int(post_sr * 0.4), dtype=np.float32)
                parts = []
                for j, wav in enumerate(post_wavs):
                    parts.append(wav)
                    if j < len(post_wavs) - 1:
                        parts.append(pause)
                full_wav = np.concatenate(parts)
                full_path = os.path.join(audio_dir, "full.wav")
                sf.write(full_path, full_wav, post_sr)
                print(f"  >> Full: {len(full_wav) / post_sr:.1f}s → {full_path}")

        total_time = time.time() - total_start
        print(f"\n{'=' * 60}")
        print(f"Done! {done} files, {total_duration:.1f}s audio in {total_time:.1f}s")
        print(f"Speed: {total_duration / total_time:.1f}x realtime")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
