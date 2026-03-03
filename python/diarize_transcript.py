#!/usr/bin/env python3
"""
Speaker diarization using speaker embeddings + spectral clustering.
Maps speaker labels to existing transcript segments.

Uses microsoft/wavlm-base-sv (speaker verification) model from HuggingFace
to extract per-segment embeddings, then clusters into 2 speakers.

No gated model access required.

Requires:
    pip install transformers soundfile scikit-learn torch numpy

Usage:
    python diarize_transcript.py
    python diarize_transcript.py --audio ../podcast_media/podcast_16k_mono.wav
    python diarize_transcript.py --verbose

Pre-processing (if starting from MP3):
    ffmpeg -i input.mp3 -ar 16000 -ac 1 -y output_16k_mono.wav
"""

import argparse
import json
import logging
import os
import time
from collections import Counter

import numpy as np
import soundfile as sf
import torch
from sklearn.cluster import SpectralClustering
from sklearn.preprocessing import normalize

logger = logging.getLogger(__name__)

FIRST_SPEAKER_NAME = "Kevin Owocki"
SECOND_SPEAKER_NAME = "James Pollack"
NUM_SPEAKERS = 2


def load_audio(audio_path: str) -> tuple[np.ndarray, int]:
    """Load WAV audio file."""
    logger.info(f"Loading audio: {audio_path}")
    data, sr = sf.read(audio_path, dtype="float32")
    if data.ndim == 2:
        data = data.mean(axis=1)
    duration = len(data) / sr
    logger.info(f"Audio loaded: {duration:.1f}s ({duration / 60:.1f} min), sr={sr}")
    return data, sr


def extract_embeddings(
    audio: np.ndarray,
    sr: int,
    segments: list[dict],
    device: torch.device,
    batch_size: int = 16,
) -> np.ndarray:
    """Extract speaker embeddings using WavLM-base-sv model."""
    from transformers import AutoFeatureExtractor, AutoModel

    model_name = "microsoft/wavlm-base-sv"
    logger.info(f"Loading model: {model_name}")
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name).to(device)
    model.eval()

    embeddings = []
    min_samples = int(0.3 * sr)

    logger.info(f"Extracting embeddings for {len(segments)} segments (batch_size={batch_size})...")

    # Process in batches
    for batch_start in range(0, len(segments), batch_size):
        batch_end = min(batch_start + batch_size, len(segments))
        batch_chunks = []

        for seg in segments[batch_start:batch_end]:
            start_sample = int(seg["start"] * sr)
            end_sample = int(seg["end"] * sr)
            start_sample = max(0, start_sample)
            end_sample = min(len(audio), end_sample)

            chunk = audio[start_sample:end_sample]

            # Pad short segments
            if len(chunk) < min_samples:
                chunk = np.pad(chunk, (0, min_samples - len(chunk)))

            batch_chunks.append(chunk)

        # Tokenize batch
        inputs = feature_extractor(
            batch_chunks,
            sampling_rate=sr,
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            # Mean pool over time dimension for each item
            hidden = outputs.last_hidden_state  # (batch, time, hidden)
            embs = hidden.mean(dim=1)  # (batch, hidden)
            embeddings.append(embs.cpu().numpy())

        if (batch_start // batch_size) % 10 == 0:
            done = min(batch_end, len(segments))
            logger.info(f"  Processed {done}/{len(segments)} segments")

    all_embeddings = np.concatenate(embeddings, axis=0)
    logger.info(f"  Extracted {len(all_embeddings)} embeddings (dim={all_embeddings.shape[1]})")
    return all_embeddings


def cluster_speakers(embeddings: np.ndarray, n_speakers: int = 2) -> np.ndarray:
    """Cluster embeddings into n_speakers using spectral clustering on cosine similarity."""
    logger.info(f"Clustering {len(embeddings)} embeddings into {n_speakers} speakers...")

    embeddings_norm = normalize(embeddings)
    affinity = np.dot(embeddings_norm, embeddings_norm.T)

    # Ensure affinity is non-negative (shift if needed)
    affinity = (affinity + 1.0) / 2.0

    clustering = SpectralClustering(
        n_clusters=n_speakers,
        affinity="precomputed",
        random_state=42,
    )
    labels = clustering.fit_predict(affinity)

    counts = Counter(labels)
    for label, count in sorted(counts.items()):
        logger.info(f"  Cluster {label}: {count} segments")

    return labels


def smooth_labels(labels: np.ndarray, window: int = 5) -> np.ndarray:
    """Smooth speaker labels with majority vote in sliding window."""
    smoothed = labels.copy()
    half = window // 2
    for i in range(len(labels)):
        start = max(0, i - half)
        end = min(len(labels), i + half + 1)
        window_labels = labels[start:end]
        counts = Counter(window_labels)
        smoothed[i] = counts.most_common(1)[0][0]
    return smoothed


def assign_speakers(segments: list[dict], labels: np.ndarray) -> list[dict]:
    """Map cluster labels to real speaker names."""
    first_cluster = labels[0]
    speaker_map = {first_cluster: FIRST_SPEAKER_NAME}
    for label in set(labels):
        if label != first_cluster:
            speaker_map[label] = SECOND_SPEAKER_NAME

    logger.info(f"Speaker mapping: {speaker_map}")

    for i, seg in enumerate(segments):
        seg["speaker"] = speaker_map[labels[i]]

    counts = Counter(seg["speaker"] for seg in segments)
    for name, count in counts.most_common():
        logger.info(f"  {name}: {count} segments")

    return segments


def main():
    parser = argparse.ArgumentParser(description="Speaker diarization for podcast transcript")
    parser.add_argument(
        "--audio",
        default=os.path.join(os.path.dirname(__file__), "..", "podcast_media", "podcast_16k_mono.wav"),
    )
    parser.add_argument(
        "--transcript",
        default=os.path.join(os.path.dirname(__file__), "..", "public", "podcast-transcript.json"),
    )
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "public"),
    )
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--num-speakers", type=int, default=NUM_SPEAKERS)
    parser.add_argument("--smooth-window", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=16)

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    audio_path = os.path.abspath(args.audio)
    transcript_path = os.path.abspath(args.transcript)
    output_dir = os.path.abspath(args.output_dir)

    if not os.path.exists(audio_path):
        logger.error(f"Audio file not found: {audio_path}")
        return
    if not os.path.exists(transcript_path):
        logger.error(f"Transcript not found: {transcript_path}")
        return

    with open(transcript_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    segments = data["segments"]

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Device: {device}")

    start = time.time()

    # Step 1: Load audio
    audio, sr = load_audio(audio_path)

    # Step 2: Extract per-segment speaker embeddings
    embeddings = extract_embeddings(audio, sr, segments, device, args.batch_size)

    # Step 3: Cluster into speakers
    labels = cluster_speakers(embeddings, args.num_speakers)

    # Step 4: Smooth labels
    labels = smooth_labels(labels, args.smooth_window)

    # Step 5: Assign names
    segments = assign_speakers(segments, labels)

    elapsed = time.time() - start
    logger.info(f"\nDiarization completed in {elapsed:.1f}s")

    # Save English transcript
    data["segments"] = segments
    en_output = os.path.join(output_dir, "podcast-transcript.json")
    with open(en_output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {en_output}")

    # Apply same labels to translations
    for locale in ["es", "zh", "ja"]:
        locale_path = os.path.join(output_dir, f"podcast-transcript-{locale}.json")
        if not os.path.exists(locale_path):
            continue

        with open(locale_path, "r", encoding="utf-8") as f:
            locale_data = json.load(f)

        if len(locale_data["segments"]) == len(data["segments"]):
            for i, seg in enumerate(locale_data["segments"]):
                seg["speaker"] = data["segments"][i]["speaker"]
            with open(locale_path, "w", encoding="utf-8") as f:
                json.dump(locale_data, f, ensure_ascii=False, indent=2)
            logger.info(f"  Updated {locale}: {locale_path}")
        else:
            logger.warning(f"  {locale} segment count mismatch -- skipping")

    logger.info("\nDone!")


if __name__ == "__main__":
    main()
