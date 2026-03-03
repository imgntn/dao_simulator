#!/usr/bin/env python3
"""
Speaker diarization for podcast transcript.

Strategy A (preferred): pyannote-audio community-1 pipeline — gold standard.
  Requires accepting terms at https://huggingface.co/pyannote/speaker-diarization-community-1
  and https://huggingface.co/pyannote/segmentation-3.0

Strategy B (fallback): WavLM speaker embeddings + spectral clustering.
  No gated access required but slightly less accurate.

Pre-processing (if starting from MP3):
    ffmpeg -i input.mp3 -ar 16000 -ac 1 -y output_16k_mono.wav

Usage:
    python diarize_transcript.py
    python diarize_transcript.py --method pyannote
    python diarize_transcript.py --method wavlm
    python diarize_transcript.py --verbose
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

# Monkey-patch torchaudio for compatibility with pyannote.audio 4.0.4
# Newer torchaudio removed list_audio_backends(); pyannote/speechbrain still reference it
import torchaudio
if not hasattr(torchaudio, "list_audio_backends"):
    torchaudio.list_audio_backends = lambda: ["soundfile"]

logger = logging.getLogger(__name__)

FIRST_SPEAKER_NAME = "Kevin Owocki"
SECOND_SPEAKER_NAME = "James Pollack"
NUM_SPEAKERS = 2


def load_audio_sf(audio_path: str) -> tuple[np.ndarray, int]:
    """Load WAV audio file via soundfile."""
    logger.info(f"Loading audio: {audio_path}")
    data, sr = sf.read(audio_path, dtype="float32")
    if data.ndim == 2:
        data = data.mean(axis=1)
    duration = len(data) / sr
    logger.info(f"Audio loaded: {duration:.1f}s ({duration / 60:.1f} min), sr={sr}")
    return data, sr


# ──────────────────────────────────────────────────────────────────────
#  Strategy A: pyannote-audio
# ──────────────────────────────────────────────────────────────────────

def diarize_pyannote(audio_path: str, num_speakers: int = 2) -> list[dict]:
    """Run pyannote speaker diarization and return list of turns."""
    from pyannote.audio import Pipeline

    models = [
        "pyannote/speaker-diarization-community-1",
        "pyannote/speaker-diarization-3.1",
    ]

    pipeline = None
    for model_id in models:
        try:
            logger.info(f"Loading pyannote pipeline: {model_id}")
            pipeline = Pipeline.from_pretrained(model_id)
            break
        except Exception as e:
            logger.warning(f"  Failed: {e}")
            continue

    if pipeline is None:
        raise RuntimeError("Could not load any pyannote pipeline. Accept model terms first.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    pipeline.to(device)

    logger.info(f"Running diarization on {audio_path}...")
    start = time.time()

    # Load audio into memory as waveform dict (avoids torchcodec issues on Windows)
    audio_data, sr = load_audio_sf(audio_path)
    waveform = torch.from_numpy(audio_data).unsqueeze(0)  # (1, samples)
    audio_input = {"waveform": waveform, "sample_rate": sr}

    raw_output = pipeline(audio_input, num_speakers=num_speakers)
    elapsed = time.time() - start
    logger.info(f"Diarization completed in {elapsed:.1f}s")

    # community-1 returns DiarizeOutput; extract the Annotation
    if hasattr(raw_output, "speaker_diarization"):
        output = raw_output.speaker_diarization
    else:
        output = raw_output

    turns = []
    for turn, _, speaker in output.itertracks(yield_label=True):
        turns.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker,
        })

    logger.info(f"Found {len(turns)} diarization turns")

    # Log speaker distribution
    speaker_times: dict[str, float] = {}
    for t in turns:
        dur = t["end"] - t["start"]
        speaker_times[t["speaker"]] = speaker_times.get(t["speaker"], 0.0) + dur
    for spk, dur in sorted(speaker_times.items()):
        logger.info(f"  {spk}: {dur:.1f}s ({dur / 60:.1f} min)")

    return turns


def map_turns_to_segments(
    segments: list[dict], diar_turns: list[dict]
) -> np.ndarray:
    """Map pyannote diarization turns to segment labels via temporal overlap."""
    labels = []
    all_speakers = sorted(set(t["speaker"] for t in diar_turns))
    speaker_to_id = {s: i for i, s in enumerate(all_speakers)}

    for seg in segments:
        overlap: dict[str, float] = {}
        for turn in diar_turns:
            o_start = max(seg["start"], turn["start"])
            o_end = min(seg["end"], turn["end"])
            o = max(0.0, o_end - o_start)
            if o > 0:
                overlap[turn["speaker"]] = overlap.get(turn["speaker"], 0.0) + o

        if overlap:
            best = max(overlap, key=overlap.get)
            labels.append(speaker_to_id[best])
        else:
            labels.append(0)  # fallback

    return np.array(labels)


# ──────────────────────────────────────────────────────────────────────
#  Strategy B: WavLM embeddings + spectral clustering
# ──────────────────────────────────────────────────────────────────────

def diarize_wavlm(
    audio: np.ndarray, sr: int, segments: list[dict], device: torch.device,
    batch_size: int = 16,
) -> np.ndarray:
    """Extract WavLM speaker embeddings and cluster into speakers."""
    from sklearn.cluster import SpectralClustering
    from sklearn.preprocessing import normalize
    from transformers import AutoFeatureExtractor, AutoModel

    model_name = "microsoft/wavlm-base-sv"
    logger.info(f"Loading model: {model_name}")
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name).to(device)
    model.eval()

    embeddings = []
    min_samples = int(0.3 * sr)

    logger.info(f"Extracting embeddings for {len(segments)} segments...")
    for batch_start in range(0, len(segments), batch_size):
        batch_end = min(batch_start + batch_size, len(segments))
        batch_chunks = []
        for seg in segments[batch_start:batch_end]:
            s = max(0, int(seg["start"] * sr))
            e = min(len(audio), int(seg["end"] * sr))
            chunk = audio[s:e]
            if len(chunk) < min_samples:
                chunk = np.pad(chunk, (0, min_samples - len(chunk)))
            batch_chunks.append(chunk)

        inputs = feature_extractor(batch_chunks, sampling_rate=sr, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            hidden = model(**inputs).last_hidden_state
            embs = hidden.mean(dim=1)
            embeddings.append(embs.cpu().numpy())

        if (batch_start // batch_size) % 10 == 0:
            logger.info(f"  Processed {min(batch_end, len(segments))}/{len(segments)} segments")

    all_emb = np.concatenate(embeddings, axis=0)
    logger.info(f"  Extracted {len(all_emb)} embeddings (dim={all_emb.shape[1]})")

    # Spectral clustering on cosine similarity
    emb_norm = normalize(all_emb)
    affinity = (np.dot(emb_norm, emb_norm.T) + 1.0) / 2.0

    clustering = SpectralClustering(n_clusters=NUM_SPEAKERS, affinity="precomputed", random_state=42)
    labels = clustering.fit_predict(affinity)
    return labels


# ──────────────────────────────────────────────────────────────────────
#  Common utilities
# ──────────────────────────────────────────────────────────────────────

def smooth_labels(labels: np.ndarray, window: int = 5) -> np.ndarray:
    """Majority-vote smoothing in a sliding window."""
    smoothed = labels.copy()
    half = window // 2
    for i in range(len(labels)):
        s = max(0, i - half)
        e = min(len(labels), i + half + 1)
        counts = Counter(labels[s:e])
        smoothed[i] = counts.most_common(1)[0][0]
    return smoothed


def assign_speaker_names(
    segments: list[dict], labels: np.ndarray,
) -> list[dict]:
    """Map cluster IDs to real names. First segment's cluster = Kevin (host intro)."""
    first_cluster = labels[0]
    speaker_map = {first_cluster: FIRST_SPEAKER_NAME}
    for lbl in set(labels):
        if lbl != first_cluster:
            speaker_map[lbl] = SECOND_SPEAKER_NAME

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
    parser.add_argument(
        "--method",
        choices=["auto", "pyannote", "wavlm"],
        default="auto",
        help="Diarization method (auto tries pyannote first, falls back to wavlm)",
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

    method = args.method
    labels = None

    # Strategy A: pyannote
    if method in ("auto", "pyannote"):
        try:
            diar_turns = diarize_pyannote(audio_path, args.num_speakers)
            labels = map_turns_to_segments(segments, diar_turns)
            logger.info("Using pyannote diarization results")
        except Exception as e:
            if method == "pyannote":
                logger.error(f"pyannote failed: {e}")
                return
            logger.warning(f"pyannote unavailable ({e}), falling back to WavLM")

    # Strategy B: WavLM fallback
    if labels is None:
        audio_data, sr = load_audio_sf(audio_path)
        labels = diarize_wavlm(audio_data, sr, segments, device, args.batch_size)

    # Smooth + assign names
    labels = smooth_labels(labels, args.smooth_window)
    segments = assign_speaker_names(segments, labels)

    elapsed = time.time() - start
    logger.info(f"\nDiarization completed in {elapsed:.1f}s")

    # Save English
    data["segments"] = segments
    en_output = os.path.join(output_dir, "podcast-transcript.json")
    with open(en_output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {en_output}")

    # Apply to translations
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
            logger.info(f"  Updated {locale}")
        else:
            logger.warning(f"  {locale} segment count mismatch -- skipping")

    logger.info("\nDone!")


if __name__ == "__main__":
    main()
