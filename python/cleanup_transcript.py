#!/usr/bin/env python3
"""
Clean up whisper transcript artifacts: hallucination loops, text errors,
duplicate segments, and technical term corrections.
"""

import json
import sys
import os

def cleanup_transcript(input_path: str, output_path: str | None = None):
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    segments = data['segments']
    chapters = data.get('chapters', [])
    original_count = len(segments)

    # === 1. Text corrections (applied before removals) ===
    text_fixes = {
        # segment_id: new_text (or None to remove)
    }

    for seg in segments:
        sid = seg['id']
        text = seg['text']

        # Fix "EBM" → "ABM" in segment 291
        if sid == 291 and 'EBM' in text:
            seg['text'] = text.replace('EBM', 'ABM')

        # Fix "scope creak" → "scope creep" in segment 303
        if sid == 303 and 'scope creak' in text:
            seg['text'] = text.replace('scope creak', 'scope creep')

        # Fix "your readers" → "your listeners" in segment 652
        if sid == 652 and 'readers' in text:
            seg['text'] = text.replace('readers', 'listeners')

        # Fix "luck luck" → "luck" in segment 665
        if sid == 665 and 'luck luck' in text:
            seg['text'] = text.replace('luck luck', 'luck')

        # Fix "developer um in information and it's desire" → "believer in information and its desire"
        if sid == 687:
            seg['text'] = text.replace('developer um in information and it\'s desire', 'believer in information and its desire')

        # Fix segment 693 ending
        if sid == 693 and 'peace move' in text:
            seg['text'] = text.replace('peace move', 'peace')

        # Fix "Vali, back to you" → "Alright, back to you" in segment 104
        if sid == 104 and text.startswith('Vali,'):
            seg['text'] = text.replace('Vali,', 'Alright,')

        # Fix hallucinated repetition in segment 168-169
        if sid == 168:
            seg['text'] = "of people. And so, you know, I've done a lot of research on this. And I think it's really cool."

        # Fix hallucinated repetition in segment 179
        if sid == 179:
            seg['text'] = "are like oh I'm a developer, I'm an arbitrator... but"

        # Fix hallucinated repetition in segment 681
        if sid == 681:
            seg['text'] = "maybe in the future, I don't know."

        # Fix "5,000 listeners between five and seven" in segment 437
        if sid == 437 and 'between five and seven' in text:
            seg['text'] = text.replace('between five and seven', 'between 5,000 and 7,000')

    # === 2. Remove hallucination/duplicate segments ===
    remove_ids = set()

    # Segments 72-97: "Yeah." hallucination loop (keep 71 as the single "Yeah.")
    for i in range(72, 98):
        remove_ids.add(i)

    # Segment 44-45: duplicate of 43 content
    remove_ids.add(44)
    remove_ids.add(45)
    # Extend segment 43 end time to cover the gap
    for seg in segments:
        if seg['id'] == 43:
            seg['end'] = 211.1  # Cover through 45's end time
            break

    # Segment 169: pure hallucination repetition (168 already cleaned up)
    remove_ids.add(169)

    # Segment 180: pure hallucination repetition of "i'm a developer"
    remove_ids.add(180)

    # Filter out removed segments
    new_segments = [seg for seg in segments if seg['id'] not in remove_ids]

    # === 3. Re-number segment IDs sequentially ===
    old_to_new = {}
    for i, seg in enumerate(new_segments):
        old_to_new[seg['id']] = i
        seg['id'] = i

    # === 4. Update chapter segment references ===
    for ch in chapters:
        start_id = ch['startSegmentId']
        end_id = ch['endSegmentId']

        # Find closest valid new IDs
        while start_id not in old_to_new and start_id < max(old_to_new.keys()):
            start_id += 1
        while end_id not in old_to_new and end_id > 0:
            end_id -= 1

        if start_id in old_to_new:
            ch['startSegmentId'] = old_to_new[start_id]
        if end_id in old_to_new:
            ch['endSegmentId'] = old_to_new[end_id]

        # Update chapter start/end times from segments
        if ch['startSegmentId'] < len(new_segments):
            ch['startTime'] = new_segments[ch['startSegmentId']]['start']
        if ch['endSegmentId'] < len(new_segments):
            ch['endTime'] = new_segments[ch['endSegmentId']]['end']

    data['segments'] = new_segments
    data['chapters'] = chapters

    out = output_path or input_path
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    removed = original_count - len(new_segments)
    print(f"  {os.path.basename(out)}: {original_count} -> {len(new_segments)} segments ({removed} removed)")
    return removed


def cleanup_translated(input_path: str, en_data_path: str):
    """Apply the same structural cleanup to translated files, keeping translations."""
    with open(en_data_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    segments = data['segments']
    original_count = len(segments)

    # Same removal IDs as English
    remove_ids = {44, 45, 169, 180}
    remove_ids.update(range(72, 98))

    # Text fixes that apply in translated versions too (proper nouns, obvious errors)
    for seg in segments:
        sid = seg['id']
        text = seg['text']

        if sid == 291 and 'EBM' in text:
            seg['text'] = text.replace('EBM', 'ABM')

        # Fix hallucinated repetitions (use simpler cleaned versions)
        if sid == 681:
            # Just keep first sentence-like chunk
            parts = text.split(',')
            if len(parts) > 2:
                seg['text'] = ','.join(parts[:2]).strip() + '.'

    # For segments 168, 179 in translated files - try to clean up repetitions
    for seg in segments:
        if seg['id'] == 168:
            # Remove repeated phrases
            text = seg['text']
            # Find the first occurrence of a repeated phrase and keep just that
            for phrase_len in range(10, 50):
                phrase = text[:phrase_len]
                if phrase and text.count(phrase) > 1:
                    # Found a repeating pattern
                    idx = text.find(phrase, len(phrase))
                    if idx > 0:
                        seg['text'] = text[:idx].rstrip('. ') + '.'
                        break

        if seg['id'] == 179:
            text = seg['text']
            for phrase_len in range(10, 50):
                phrase = text[:phrase_len]
                if phrase and text.count(phrase) > 1:
                    idx = text.find(phrase, len(phrase))
                    if idx > 0:
                        seg['text'] = text[:idx].rstrip('. ') + '.'
                        break

    new_segments = [seg for seg in segments if seg['id'] not in remove_ids]

    # Extend segment 43 end time
    for seg in new_segments:
        if seg['id'] == 43:
            seg['end'] = 211.1
            break

    # Re-number
    old_to_new = {}
    for i, seg in enumerate(new_segments):
        old_to_new[seg['id']] = i
        seg['id'] = i

    # Copy chapter structure from English (already corrected)
    data['segments'] = new_segments
    data['chapters'] = en_data['chapters']

    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    removed = original_count - len(new_segments)
    print(f"  {os.path.basename(input_path)}: {original_count} -> {len(new_segments)} segments ({removed} removed)")


def main():
    base_dir = os.path.join(os.path.dirname(__file__), '..', 'public')

    en_path = os.path.join(base_dir, 'podcast-transcript.json')
    print("Cleaning up English transcript...")
    cleanup_transcript(en_path)

    print("\nCleaning up translated transcripts...")
    for locale in ['es', 'zh', 'ja']:
        path = os.path.join(base_dir, f'podcast-transcript-{locale}.json')
        if os.path.exists(path):
            cleanup_translated(path, en_path)
        else:
            print(f"  Skipping {locale} (file not found)")

    print("\nDone!")


if __name__ == '__main__':
    main()
