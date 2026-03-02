#!/usr/bin/env python3
"""
Podcast Transcriber

Transcribes the Green Pill #123 podcast MP3 using faster-whisper and outputs
timestamped segments as JSON for the synchronized transcript UI component.

Features:
  - Heuristic speaker diarization via silence gap detection
  - Automatic chapter generation from silence gaps
  - Speaker labels (Kevin Owocki = host, James Pollack = guest)

Usage:
    python transcribe_podcast.py [--output PATH] [--model MODEL] [--device DEVICE]
    python transcribe_podcast.py --mp3 ../podcast_media/Audio_Only_Greenpill_James_Pollack.mp3 --model large-v3 --verbose

Example:
    python transcribe_podcast.py --output ../public/podcast-transcript.json
"""

import argparse
import json
import logging
import os
import sys
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

PODCAST_URL = "https://pub-5203989d31a346d288f97e48812ab2e0.r2.dev/greenpill-123-james-pollack.mp3"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "podcast-transcript.json"
DEFAULT_MP3 = PROJECT_ROOT / "podcast_media" / "Audio_Only_Greenpill_James_Pollack.mp3"

SPEAKERS = ["Kevin Owocki", "James Pollack"]
SPEAKER_CHANGE_GAP = 1.2  # seconds of silence to detect speaker change (p95 of gap distribution)
CHAPTER_GAP = 1.5  # seconds of silence to start a new chapter
CHAPTER_MAX_SEGMENTS = 50  # max segments before forcing a chapter break
CHAPTER_MIN_SEGMENTS = 10  # merge chapters smaller than this into previous


def download_mp3(url: str, dest: str) -> str:
    """Download MP3 from URL to a local file. Returns the local path."""
    import urllib.request

    logger.info("Downloading MP3 from %s ...", url)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) podcast-transcriber/1.0",
    })
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    file_size = os.path.getsize(dest)
    logger.info("Downloaded %.1f MB to %s", file_size / (1024 * 1024), dest)
    return dest


def transcribe(audio_path: str, model_size: str, device: str) -> list[dict]:
    """Run faster-whisper on the audio file and return segments."""
    from faster_whisper import WhisperModel

    logger.info("Loading model '%s' on device '%s' ...", model_size, device)
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    logger.info("Transcribing (this may take a while) ...")
    segments_iter, info = model.transcribe(
        audio_path,
        language="en",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    logger.info("Detected language: %s (probability %.2f)", info.language, info.language_probability)

    segments = []
    for i, seg in enumerate(segments_iter):
        segments.append({
            "id": i,
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        })
        if (i + 1) % 50 == 0:
            logger.info("  ... processed %d segments (%.1fs)", i + 1, seg.end)

    logger.info("Transcription complete: %d segments, %.1f minutes",
                len(segments), segments[-1]["end"] / 60 if segments else 0)
    return segments


def assign_speakers(segments: list[dict]) -> list[dict]:
    """Heuristic speaker diarization based on silence gaps between segments.

    Kevin Owocki speaks first (host intro). On each silence gap > SPEAKER_CHANGE_GAP
    seconds between consecutive segments, we toggle the speaker.
    """
    if not segments:
        return segments

    current_speaker_idx = 0  # Kevin speaks first
    segments[0]["speaker"] = SPEAKERS[current_speaker_idx]

    for i in range(1, len(segments)):
        gap = segments[i]["start"] - segments[i - 1]["end"]
        if gap >= SPEAKER_CHANGE_GAP:
            current_speaker_idx = 1 - current_speaker_idx  # toggle
            logger.debug("Speaker change at %.2fs (gap=%.2fs) → %s",
                         segments[i]["start"], gap, SPEAKERS[current_speaker_idx])
        segments[i]["speaker"] = SPEAKERS[current_speaker_idx]

    # Log speaker distribution
    counts = {}
    for seg in segments:
        counts[seg["speaker"]] = counts.get(seg["speaker"], 0) + 1
    for speaker, count in counts.items():
        logger.info("Speaker '%s': %d segments", speaker, count)

    return segments


def generate_chapters(segments: list[dict]) -> list[dict]:
    """Generate chapters from silence gaps and segment count limits.

    A new chapter starts when:
    - There is a silence gap > CHAPTER_GAP between consecutive segments, OR
    - The current chapter has accumulated >= CHAPTER_MAX_SEGMENTS segments

    Chapters with fewer than CHAPTER_MIN_SEGMENTS are merged into the previous chapter.
    """
    if not segments:
        return []

    def make_title(start_idx: int) -> str:
        text = segments[start_idx]["text"]
        if len(text) <= 55:
            return text
        truncated = text[:55]
        last_space = truncated.rfind(" ")
        if last_space > 25:
            truncated = truncated[:last_space]
        return truncated + "..."

    # First pass: split on gaps and max-segment count
    raw_ranges: list[tuple[int, int]] = []
    chapter_start_idx = 0

    for i in range(1, len(segments)):
        gap = segments[i]["start"] - segments[i - 1]["end"]
        segments_in_chapter = i - chapter_start_idx

        if gap >= CHAPTER_GAP or segments_in_chapter >= CHAPTER_MAX_SEGMENTS:
            raw_ranges.append((chapter_start_idx, i - 1))
            chapter_start_idx = i

    raw_ranges.append((chapter_start_idx, len(segments) - 1))

    # Second pass: merge tiny chapters into previous
    merged: list[tuple[int, int]] = [raw_ranges[0]]
    for start, end in raw_ranges[1:]:
        seg_count = end - start + 1
        if seg_count < CHAPTER_MIN_SEGMENTS:
            prev_start, _ = merged[-1]
            merged[-1] = (prev_start, end)
        else:
            merged.append((start, end))

    # Build chapter objects
    chapters = []
    for idx, (start, end) in enumerate(merged):
        chapters.append({
            "id": idx,
            "title": make_title(start),
            "startTime": segments[start]["start"],
            "endTime": segments[end]["end"],
            "startSegmentId": segments[start]["id"],
            "endSegmentId": segments[end]["id"],
        })

    logger.info("Generated %d chapters (merged from %d raw splits)", len(chapters), len(raw_ranges))
    for ch in chapters:
        logger.debug("  Chapter %d: %.1fs-%.1fs (%d segs) — %s",
                      ch["id"], ch["startTime"], ch["endTime"],
                      ch["endSegmentId"] - ch["startSegmentId"] + 1, ch["title"])

    return chapters


def main():
    parser = argparse.ArgumentParser(description="Transcribe podcast MP3 to timestamped JSON")
    parser.add_argument("--output", "-o", type=str, default=str(DEFAULT_OUTPUT),
                        help="Output JSON path (default: public/podcast-transcript.json)")
    parser.add_argument("--model", "-m", type=str, default="large-v3",
                        help="Whisper model size: tiny, base, small, medium, large-v3 (default: large-v3)")
    parser.add_argument("--device", "-d", type=str, default="auto",
                        help="Device: auto, cpu, cuda (default: auto)")
    parser.add_argument("--mp3", type=str, default=None,
                        help="Path to local MP3 file (skips download)")
    parser.add_argument("--diarize", action=argparse.BooleanOptionalAction, default=True,
                        help="Enable heuristic speaker diarization (default: true)")
    parser.add_argument("--chapters", action=argparse.BooleanOptionalAction, default=True,
                        help="Enable automatic chapter generation (default: true)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    # Resolve device
    device = args.device
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
    logger.info("Using device: %s", device)

    # Get audio file — prefer local MP3 if it exists
    if args.mp3:
        audio_path = args.mp3
        logger.info("Using local MP3: %s", audio_path)
    elif DEFAULT_MP3.exists():
        audio_path = str(DEFAULT_MP3)
        logger.info("Using local MP3: %s", audio_path)
    else:
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp.close()
        audio_path = download_mp3(PODCAST_URL, tmp.name)

    try:
        segments = transcribe(audio_path, args.model, device)
    finally:
        # Clean up downloaded temp file
        if not args.mp3 and not DEFAULT_MP3.exists() and os.path.exists(audio_path):
            os.unlink(audio_path)

    # Heuristic speaker diarization
    if args.diarize:
        segments = assign_speakers(segments)

    # Chapter generation
    chapters = generate_chapters(segments) if args.chapters else []

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    result = {"chapters": chapters, "segments": segments}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logger.info("Wrote %d segments, %d chapters to %s (%.1f KB)",
                len(segments), len(chapters), output_path,
                output_path.stat().st_size / 1024)


if __name__ == "__main__":
    main()
