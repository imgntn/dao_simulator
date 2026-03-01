#!/usr/bin/env python3
"""
Podcast Transcriber

Transcribes the Green Pill #123 podcast MP3 using faster-whisper and outputs
timestamped segments as JSON for the synchronized transcript UI component.

Usage:
    python transcribe_podcast.py [--output PATH] [--model MODEL] [--device DEVICE]

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


def main():
    parser = argparse.ArgumentParser(description="Transcribe podcast MP3 to timestamped JSON")
    parser.add_argument("--output", "-o", type=str, default=str(DEFAULT_OUTPUT),
                        help="Output JSON path (default: public/podcast-transcript.json)")
    parser.add_argument("--model", "-m", type=str, default="base",
                        help="Whisper model size: tiny, base, small, medium, large-v3 (default: base)")
    parser.add_argument("--device", "-d", type=str, default="auto",
                        help="Device: auto, cpu, cuda (default: auto)")
    parser.add_argument("--mp3", type=str, default=None,
                        help="Path to local MP3 file (skips download)")
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

    # Get audio file
    if args.mp3:
        audio_path = args.mp3
        logger.info("Using local MP3: %s", audio_path)
    else:
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp.close()
        audio_path = download_mp3(PODCAST_URL, tmp.name)

    try:
        segments = transcribe(audio_path, args.model, device)
    finally:
        # Clean up downloaded temp file
        if not args.mp3 and os.path.exists(audio_path):
            os.unlink(audio_path)

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    result = {"segments": segments}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logger.info("Wrote %d segments to %s (%.1f KB)",
                len(segments), output_path,
                output_path.stat().st_size / 1024)


if __name__ == "__main__":
    main()
