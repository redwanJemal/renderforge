#!/bin/bash
# Download voice reference clips from Internet Archive (free, no auth needed)
# Each clip: ~15-20s of clean speech, mono WAV 24kHz

YTDLP="/tmp/yt-dlp"
VOICES_DIR="/home/redman/renderforge/content/audio/voices"
cd "$VOICES_DIR"

download_archive() {
    local name="$1"
    local url="$2"
    local start="$3"
    local duration="${4:-20}"
    local outfile="${name}.wav"

    if [ -f "$outfile" ]; then
        echo "SKIP: $outfile already exists"
        return
    fi

    echo "Downloading: $name ..."
    $YTDLP --no-check-certificates -x --audio-format wav -o "${name}_full.%(ext)s" --playlist-items 1 "$url" 2>&1 | grep -E "(Downloading|download|ERROR)"

    # Find the downloaded file (could be various extensions before conversion)
    local src=$(ls ${name}_full.* 2>/dev/null | head -1)
    if [ -n "$src" ]; then
        # Extract clean segment: mono, 24kHz
        ffmpeg -y -i "$src" -ss "$start" -t "$duration" -ar 24000 -ac 1 "$outfile" 2>/dev/null
        rm -f ${name}_full.*
        local filesize=$(du -h "$outfile" | cut -f1)
        echo "  OK: $outfile ($filesize, ${duration}s from ${start})"
    else
        echo "  FAIL: Could not download $name"
    fi
}

download_direct() {
    local name="$1"
    local url="$2"
    local start="$3"
    local duration="${4:-20}"
    local outfile="${name}.wav"

    if [ -f "$outfile" ]; then
        echo "SKIP: $outfile already exists"
        return
    fi

    echo "Downloading: $name (direct) ..."
    curl -sL "$url" -o "${name}_full.mp3"

    if [ -f "${name}_full.mp3" ] && [ -s "${name}_full.mp3" ]; then
        ffmpeg -y -i "${name}_full.mp3" -ss "$start" -t "$duration" -ar 24000 -ac 1 "$outfile" 2>/dev/null
        rm -f "${name}_full.mp3"
        local filesize=$(du -h "$outfile" | cut -f1)
        echo "  OK: $outfile ($filesize, ${duration}s from ${start})"
    else
        echo "  FAIL: Could not download $name"
        rm -f "${name}_full.mp3"
    fi
}

echo "================================================"
echo "  Downloading Voice Reference Clips"
echo "  Source: Internet Archive (free/public)"
echo "================================================"
echo ""

# 1. Les Brown — "It's Not Over Until You Win" Georgia Dome
download_archive "les_brown" \
    "https://archive.org/details/DontMakeExcuses" \
    "00:00:30" "20"

# 2. Eric Thomas — Best of ET motivational speeches
download_archive "eric_thomas" \
    "https://archive.org/details/Eric4" \
    "00:00:20" "20"

# 3. David Goggins — Team Never Quit podcast clip
download_archive "david_goggins" \
    "https://archive.org/details/Goggins" \
    "00:00:10" "20"

# 4. Tony Robbins — TED Talk "Why we do what we do"
download_archive "tony_robbins" \
    "https://archive.org/details/TonyRobbins2006" \
    "00:00:30" "20"

# 5. Denzel Washington — UPenn 2011 "Fall Forward" commencement
download_archive "denzel_washington" \
    "https://archive.org/details/podcast_penn-commencement-penn-comme_denzel-washington-at-2011-univ_1000094125267" \
    "00:01:00" "20"

# 6. Morgan Freeman — Motivational speech
download_archive "morgan_freeman" \
    "https://archive.org/details/denzel-washington-motivational-speech.mp-3" \
    "00:00:15" "20"

# 7. Lisa Nichols — Motivational speech
download_archive "lisa_nichols" \
    "https://archive.org/details/motivational-speech" \
    "00:00:20" "20"

# 8. Mel Robbins — Motivational speech / 5 second rule
download_archive "mel_robbins" \
    "https://archive.org/details/tonyrobbinstrainyourbraintomakemoremoneyverymotivational" \
    "00:00:30" "20"

echo ""
echo "================================================"
echo "  Results"
echo "================================================"
echo ""

for f in *.wav; do
    if [ -f "$f" ]; then
        duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)
        size=$(du -h "$f" | cut -f1)
        echo "  $f — ${duration}s, $size"
    fi
done

echo ""
total=$(ls *.wav 2>/dev/null | wc -l)
echo "Total: $total voice clips downloaded"
echo ""
echo "Next: Upload these to Google Colab for voice cloning (Step 4c)"
