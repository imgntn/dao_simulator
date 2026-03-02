#!/usr/bin/env python3
"""
Podcast Transcript Translator

Translates the English podcast transcript JSON into target languages,
preserving the chapter/segment structure and speaker labels.

Uses deep-translator (Google Translate) for fast batch translation.

Usage:
    python translate_transcript.py
    python translate_transcript.py --input ../public/podcast-transcript.json --languages es zh-CN ja
    python translate_transcript.py --batch-size 20 --verbose
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Map our locale codes to Google Translate language codes
LOCALE_TO_GOOGLE = {
    "es": "es",       # Spanish
    "zh": "zh-CN",    # Chinese (Simplified)
    "ja": "ja",       # Japanese
}

# Output file names match our Next.js locale routing
LOCALE_FILE_SUFFIX = {
    "es": "es",
    "zh": "zh",
    "ja": "ja",
}


def translate_batch(texts: list[str], target_lang: str, batch_size: int = 20) -> list[str]:
    """Translate a list of texts in batches to avoid rate limits."""
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target=target_lang)
    results = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            translated = translator.translate_batch(batch)
            results.extend(translated)
        except Exception as e:
            logger.warning(f"Batch {i // batch_size} failed: {e}, retrying one by one...")
            for text in batch:
                try:
                    result = translator.translate(text)
                    results.append(result if result else text)
                except Exception as e2:
                    logger.error(f"Failed to translate: {text[:50]}... -> {e2}")
                    results.append(text)  # keep original on failure
                time.sleep(0.3)

        # Brief pause between batches to avoid rate limiting
        if i + batch_size < len(texts):
            time.sleep(0.2)

        if (i // batch_size) % 5 == 0:
            done = min(i + batch_size, len(texts))
            logger.info(f"  [{target_lang}] Translated {done}/{len(texts)} segments")

    return results


def translate_transcript(
    input_path: str,
    output_dir: str,
    languages: list[str],
    batch_size: int = 20,
) -> dict[str, str]:
    """Translate transcript JSON to multiple languages. Returns {locale: output_path}."""

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    chapters = data.get("chapters", [])

    if not segments:
        logger.error("No segments found in transcript")
        return {}

    # Extract all translatable text
    segment_texts = [seg["text"] for seg in segments]
    chapter_titles = [ch["title"] for ch in chapters]

    logger.info(f"Translating {len(segment_texts)} segments + {len(chapter_titles)} chapter titles")

    output_paths = {}

    for locale in languages:
        google_lang = LOCALE_TO_GOOGLE.get(locale, locale)
        file_suffix = LOCALE_FILE_SUFFIX.get(locale, locale)

        logger.info(f"\n--- Translating to {locale} ({google_lang}) ---")

        # Translate segments
        translated_segments = translate_batch(segment_texts, google_lang, batch_size)

        # Translate chapter titles
        translated_chapters = translate_batch(chapter_titles, google_lang, batch_size)

        # Build output JSON — same structure, translated text
        out_segments = []
        for i, seg in enumerate(segments):
            out_seg = {**seg}
            out_seg["text"] = translated_segments[i] if i < len(translated_segments) else seg["text"]
            # Keep speaker names in English (proper nouns)
            out_segments.append(out_seg)

        out_chapters = []
        for i, ch in enumerate(chapters):
            out_ch = {**ch}
            out_ch["title"] = translated_chapters[i] if i < len(translated_chapters) else ch["title"]
            out_chapters.append(out_ch)

        out_data = {
            "chapters": out_chapters,
            "segments": out_segments,
        }

        output_path = os.path.join(output_dir, f"podcast-transcript-{file_suffix}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(out_data, f, ensure_ascii=False, indent=2)

        logger.info(f"  Wrote {output_path}")
        output_paths[locale] = output_path

    return output_paths


def main():
    parser = argparse.ArgumentParser(description="Translate podcast transcript")
    parser.add_argument(
        "--input",
        default=os.path.join(os.path.dirname(__file__), "..", "public", "podcast-transcript.json"),
        help="Input transcript JSON path",
    )
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "public"),
        help="Output directory for translated JSON files",
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        default=["es", "zh", "ja"],
        help="Target language codes (default: es zh ja)",
    )
    parser.add_argument("--batch-size", type=int, default=20, help="Segments per translation batch")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    input_path = os.path.abspath(args.input)
    output_dir = os.path.abspath(args.output_dir)

    if not os.path.exists(input_path):
        logger.error(f"Input file not found: {input_path}")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    logger.info(f"Input: {input_path}")
    logger.info(f"Output dir: {output_dir}")
    logger.info(f"Languages: {args.languages}")

    start = time.time()
    paths = translate_transcript(input_path, output_dir, args.languages, args.batch_size)
    elapsed = time.time() - start

    logger.info(f"\nDone! Translated to {len(paths)} languages in {elapsed:.1f}s")
    for locale, p in paths.items():
        logger.info(f"  {locale}: {p}")


if __name__ == "__main__":
    main()
