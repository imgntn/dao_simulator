/**
 * Tests for Podcast Player components — pure logic tests (Node environment, no DOM).
 *
 * Covers: types, search filtering, speaker badge logic, chapter grouping,
 * formatTime helper, highlight text splitting, URL timestamp generation,
 * and transcript JSON structure validation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Re-create the pure helper functions from the component source so we can
// test them in a Node environment without importing React/JSX.
// (The component file uses 'use client' and JSX — not importable in Node.)
// ---------------------------------------------------------------------------

// From PodcastTranscript.tsx
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// From AudioControls.tsx (slightly different — handles edge cases)
function formatTimeAudio(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function firstName(name: string): string {
  return name.split(' ')[0];
}

const SPEAKER_COLORS: Record<string, { bg: string; text: string }> = {
  'Kevin Owocki': { bg: 'bg-[var(--accent-teal)]/15', text: 'text-[var(--accent-teal)]' },
  'James Pollack': { bg: 'bg-amber-100', text: 'text-amber-700' },
};

function getSpeakerStyle(name: string) {
  return SPEAKER_COLORS[name] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
}

/**
 * Text-only version of highlightText that returns an array of
 * { text, highlighted } segments instead of React nodes.
 */
function highlightTextParts(text: string, query: string): Array<{ text: string; highlighted: boolean }> {
  if (!query) return [{ text, highlighted: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.filter((p) => p.length > 0).map((part) => ({
    text: part,
    highlighted: regex.test(part),
  }));
}

// ---------------------------------------------------------------------------
// Shared types (mirrors the component exports)
// ---------------------------------------------------------------------------

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface TranscriptChapter {
  id: number;
  title: string;
  startTime: number;
  endTime: number;
  startSegmentId: number;
  endSegmentId: number;
}

interface TranscriptData {
  chapters: TranscriptChapter[];
  segments: TranscriptSegment[];
}

// ---------------------------------------------------------------------------
// Search filtering logic (mirrors the useMemo in PodcastTranscript)
// ---------------------------------------------------------------------------

function searchSegments(segments: TranscriptSegment[], query: string): number[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return segments.filter((seg) => seg.text.toLowerCase().includes(q)).map((seg) => seg.id);
}

// ---------------------------------------------------------------------------
// Chapter grouping logic (mirrors chapterForSegment useMemo)
// ---------------------------------------------------------------------------

function buildChapterMap(
  chapters: TranscriptChapter[],
): Map<number, TranscriptChapter> {
  const map = new Map<number, TranscriptChapter>();
  for (const ch of chapters) {
    for (let sid = ch.startSegmentId; sid <= ch.endSegmentId; sid++) {
      map.set(sid, ch);
    }
  }
  return map;
}

function getChapterSegments(
  segments: TranscriptSegment[],
  chapter: TranscriptChapter,
): TranscriptSegment[] {
  return segments.filter(
    (s) => s.id >= chapter.startSegmentId && s.id <= chapter.endSegmentId,
  );
}

// ---------------------------------------------------------------------------
// URL timestamp generation (mirrors handleCopyLink)
// ---------------------------------------------------------------------------

function generateTimestampUrl(baseUrl: string, startSeconds: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set('t', String(Math.floor(startSeconds)));
  return url.toString();
}

// =============================================================================
// Tests
// =============================================================================

// -- Sample data used across tests --
const sampleSegments: TranscriptSegment[] = [
  { id: 0, start: 5.23, end: 10.83, text: 'What is up coordination on the pod today?', speaker: 'Kevin Owocki' },
  { id: 1, start: 10.83, end: 15.23, text: 'I feel like its the ultimate nerds knife.', speaker: 'Kevin Owocki' },
  { id: 2, start: 15.43, end: 22.43, text: 'My guest today is James Pollack who as an artist and programmer', speaker: 'Kevin Owocki' },
  { id: 3, start: 173.95, end: 179.23, text: 'Maybe a good jumping off point would be for you to tell us what you have been building', speaker: 'James Pollack' },
  { id: 4, start: 180.27, end: 184.19, text: 'Sure, so I have been working on an agent-based model', speaker: 'James Pollack' },
  { id: 5, start: 184.75, end: 188.99, text: 'An agent-based model is a computer program', speaker: 'James Pollack' },
  { id: 6, start: 194.67, end: 197.95, text: 'Characters you can think of them like characters in a video game', speaker: 'Kevin Owocki' },
];

const sampleChapters: TranscriptChapter[] = [
  { id: 0, title: 'Introduction', startTime: 5.23, endTime: 172.35, startSegmentId: 0, endSegmentId: 2 },
  { id: 1, title: 'Building the Simulator', startTime: 173.95, endTime: 197.95, startSegmentId: 3, endSegmentId: 6 },
];

// =============================================================================
// 1. TranscriptSegment / Chapter types — structural shape
// =============================================================================

describe('TranscriptSegment / TranscriptChapter type shapes', () => {
  it('should have required fields on TranscriptSegment', () => {
    const seg: TranscriptSegment = { id: 0, start: 0, end: 5, text: 'Hello' };
    expect(seg).toHaveProperty('id');
    expect(seg).toHaveProperty('start');
    expect(seg).toHaveProperty('end');
    expect(seg).toHaveProperty('text');
  });

  it('should allow optional speaker field on TranscriptSegment', () => {
    const seg: TranscriptSegment = { id: 0, start: 0, end: 5, text: 'Hello', speaker: 'Alice' };
    expect(seg.speaker).toBe('Alice');
  });

  it('should allow undefined speaker on TranscriptSegment', () => {
    const seg: TranscriptSegment = { id: 0, start: 0, end: 5, text: 'Hello' };
    expect(seg.speaker).toBeUndefined();
  });

  it('should have required fields on TranscriptChapter', () => {
    const ch: TranscriptChapter = {
      id: 0, title: 'Intro', startTime: 0, endTime: 60,
      startSegmentId: 0, endSegmentId: 10,
    };
    expect(ch).toHaveProperty('id');
    expect(ch).toHaveProperty('title');
    expect(ch).toHaveProperty('startTime');
    expect(ch).toHaveProperty('endTime');
    expect(ch).toHaveProperty('startSegmentId');
    expect(ch).toHaveProperty('endSegmentId');
  });

  it('should have TranscriptData with chapters and segments arrays', () => {
    const data: TranscriptData = { chapters: [], segments: [] };
    expect(Array.isArray(data.chapters)).toBe(true);
    expect(Array.isArray(data.segments)).toBe(true);
  });
});

// =============================================================================
// 2. Search filtering logic
// =============================================================================

describe('Search filtering', () => {
  it('should return empty array for empty query', () => {
    expect(searchSegments(sampleSegments, '')).toEqual([]);
  });

  it('should return empty array for whitespace-only query', () => {
    expect(searchSegments(sampleSegments, '   ')).toEqual([]);
  });

  it('should match text case-insensitively', () => {
    const ids = searchSegments(sampleSegments, 'COORDINATION');
    expect(ids).toContain(0);
  });

  it('should match lowercase query against mixed case text', () => {
    const ids = searchSegments(sampleSegments, 'james pollack');
    expect(ids).toContain(2);
  });

  it('should return multiple matching segment IDs', () => {
    const ids = searchSegments(sampleSegments, 'agent-based model');
    expect(ids).toEqual([4, 5]);
  });

  it('should return empty array when no segments match', () => {
    const ids = searchSegments(sampleSegments, 'xyznonexistent');
    expect(ids).toEqual([]);
  });

  it('should match partial words', () => {
    const ids = searchSegments(sampleSegments, 'coord');
    expect(ids).toContain(0);
  });

  it('should match across the full segment set', () => {
    const ids = searchSegments(sampleSegments, 'characters');
    expect(ids).toEqual([6]);
  });
});

// =============================================================================
// 3. Speaker label / badge logic
// =============================================================================

describe('Speaker badge logic', () => {
  it('should show badge when speaker changes from previous segment', () => {
    // Simulate the renderSegment logic: showSpeaker = seg.speaker && seg.speaker !== prevSpeaker
    const seg = sampleSegments[3]; // James Pollack (after Kevin Owocki)
    const prevSpeaker = sampleSegments[2].speaker; // Kevin Owocki
    const showSpeaker = seg.speaker && seg.speaker !== prevSpeaker;
    expect(showSpeaker).toBe(true);
  });

  it('should NOT show badge when speaker is the same as previous', () => {
    const seg = sampleSegments[1]; // Kevin Owocki
    const prevSpeaker = sampleSegments[0].speaker; // Kevin Owocki
    const showSpeaker = seg.speaker && seg.speaker !== prevSpeaker;
    expect(showSpeaker).toBe(false);
  });

  it('should show badge for the very first segment (no previous speaker)', () => {
    const seg = sampleSegments[0]; // Kevin Owocki
    const prevSpeaker = undefined;
    const showSpeaker = seg.speaker && seg.speaker !== prevSpeaker;
    expect(showSpeaker).toBeTruthy();
  });

  it('should NOT show badge when segment has no speaker', () => {
    const seg: TranscriptSegment = { id: 99, start: 0, end: 5, text: 'No speaker' };
    const prevSpeaker = 'Kevin Owocki';
    const showSpeaker = seg.speaker && seg.speaker !== prevSpeaker;
    expect(showSpeaker).toBeFalsy();
  });

  it('should return known style for Kevin Owocki', () => {
    const style = getSpeakerStyle('Kevin Owocki');
    expect(style.bg).toContain('accent-teal');
    expect(style.text).toContain('accent-teal');
  });

  it('should return known style for James Pollack', () => {
    const style = getSpeakerStyle('James Pollack');
    expect(style.bg).toContain('amber');
    expect(style.text).toContain('amber');
  });

  it('should return fallback gray style for unknown speakers', () => {
    const style = getSpeakerStyle('Unknown Person');
    expect(style.bg).toBe('bg-gray-100');
    expect(style.text).toBe('text-gray-600');
  });

  it('should extract first name correctly', () => {
    expect(firstName('Kevin Owocki')).toBe('Kevin');
    expect(firstName('James Pollack')).toBe('James');
    expect(firstName('SingleName')).toBe('SingleName');
  });
});

// =============================================================================
// 4. Chapter grouping
// =============================================================================

describe('Chapter grouping', () => {
  it('should build a chapter map covering all segment IDs in range', () => {
    const map = buildChapterMap(sampleChapters);
    // Chapter 0 covers segments 0-2
    expect(map.get(0)?.id).toBe(0);
    expect(map.get(1)?.id).toBe(0);
    expect(map.get(2)?.id).toBe(0);
    // Chapter 1 covers segments 3-6
    expect(map.get(3)?.id).toBe(1);
    expect(map.get(4)?.id).toBe(1);
    expect(map.get(5)?.id).toBe(1);
    expect(map.get(6)?.id).toBe(1);
  });

  it('should return undefined for segment IDs not in any chapter', () => {
    const map = buildChapterMap(sampleChapters);
    expect(map.get(99)).toBeUndefined();
    expect(map.get(-1)).toBeUndefined();
  });

  it('should handle empty chapters array', () => {
    const map = buildChapterMap([]);
    expect(map.size).toBe(0);
  });

  it('should filter segments belonging to a specific chapter', () => {
    const chSegs = getChapterSegments(sampleSegments, sampleChapters[0]);
    expect(chSegs.map((s) => s.id)).toEqual([0, 1, 2]);
  });

  it('should filter segments for second chapter correctly', () => {
    const chSegs = getChapterSegments(sampleSegments, sampleChapters[1]);
    expect(chSegs.map((s) => s.id)).toEqual([3, 4, 5, 6]);
  });

  it('should return empty array if no segments fall in chapter range', () => {
    const emptyChapter: TranscriptChapter = {
      id: 99, title: 'Empty', startTime: 999, endTime: 1000,
      startSegmentId: 100, endSegmentId: 200,
    };
    const result = getChapterSegments(sampleSegments, emptyChapter);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// 5. formatTime helper
// =============================================================================

describe('formatTime helper (PodcastTranscript version)', () => {
  it('should format 0 seconds as "0:00"', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('should format 5 seconds as "0:05"', () => {
    expect(formatTime(5)).toBe('0:05');
  });

  it('should format 59 seconds as "0:59"', () => {
    expect(formatTime(59)).toBe('0:59');
  });

  it('should format 60 seconds as "1:00"', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('should format 65 seconds as "1:05"', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('should format 3600 seconds (1 hour) as "60:00"', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  it('should truncate fractional seconds', () => {
    expect(formatTime(5.23)).toBe('0:05');
    expect(formatTime(65.99)).toBe('1:05');
  });

  it('should format large values correctly', () => {
    expect(formatTime(2860.27)).toBe('47:40');
  });
});

describe('formatTime helper (AudioControls version)', () => {
  it('should return "0:00" for NaN', () => {
    expect(formatTimeAudio(NaN)).toBe('0:00');
  });

  it('should return "0:00" for Infinity', () => {
    expect(formatTimeAudio(Infinity)).toBe('0:00');
  });

  it('should return "0:00" for negative values', () => {
    expect(formatTimeAudio(-10)).toBe('0:00');
  });

  it('should format valid values normally', () => {
    expect(formatTimeAudio(65)).toBe('1:05');
  });
});

// =============================================================================
// 6. Highlight text logic
// =============================================================================

describe('Highlight text splitting', () => {
  it('should return full text with no highlighting for empty query', () => {
    const parts = highlightTextParts('Hello world', '');
    expect(parts).toEqual([{ text: 'Hello world', highlighted: false }]);
  });

  it('should highlight a matching word (case-insensitive)', () => {
    const parts = highlightTextParts('Hello world', 'world');
    expect(parts.length).toBe(2);
    expect(parts[0]).toEqual({ text: 'Hello ', highlighted: false });
    expect(parts[1]).toEqual({ text: 'world', highlighted: true });
  });

  it('should highlight multiple occurrences', () => {
    const parts = highlightTextParts('the cat and the dog', 'the');
    const highlighted = parts.filter((p) => p.highlighted);
    expect(highlighted.length).toBe(2);
    expect(highlighted[0].text.toLowerCase()).toBe('the');
    expect(highlighted[1].text.toLowerCase()).toBe('the');
  });

  it('should handle case-insensitive matching and preserve original case', () => {
    const parts = highlightTextParts('DAO Governance is great', 'dao');
    const match = parts.find((p) => p.highlighted);
    expect(match).toBeDefined();
    expect(match!.text).toBe('DAO');
  });

  it('should safely handle regex special characters in query', () => {
    const parts = highlightTextParts('price is $10.00 (USD)', '$10.00');
    const match = parts.find((p) => p.highlighted);
    expect(match).toBeDefined();
    expect(match!.text).toBe('$10.00');
  });

  it('should return single non-highlighted part when query has no match', () => {
    const parts = highlightTextParts('Hello world', 'zzz');
    expect(parts).toEqual([{ text: 'Hello world', highlighted: false }]);
  });
});

// =============================================================================
// 7. URL timestamp generation
// =============================================================================

describe('URL timestamp generation', () => {
  const baseUrl = 'https://daosimulator.org/en';

  it('should append ?t= with floored seconds', () => {
    const url = generateTimestampUrl(baseUrl, 5.23);
    expect(url).toContain('?t=5');
    expect(url).not.toContain('t=5.23');
  });

  it('should floor fractional seconds', () => {
    const url = generateTimestampUrl(baseUrl, 65.99);
    expect(url).toContain('t=65');
  });

  it('should generate t=0 for 0 seconds', () => {
    const url = generateTimestampUrl(baseUrl, 0);
    expect(url).toContain('t=0');
  });

  it('should handle large timestamps', () => {
    const url = generateTimestampUrl(baseUrl, 2860.27);
    expect(url).toContain('t=2860');
  });

  it('should preserve existing URL path', () => {
    const url = generateTimestampUrl('https://example.com/podcast', 120);
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/podcast');
    expect(parsed.searchParams.get('t')).toBe('120');
  });

  it('should overwrite existing t param', () => {
    const url = generateTimestampUrl('https://example.com?t=999', 42);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('t')).toBe('42');
  });
});

// =============================================================================
// 8. Transcript JSON structure validation
// =============================================================================

describe('Transcript JSON structure (public/podcast-transcript.json)', () => {
  let data: TranscriptData;

  // Load the real transcript file once
  const jsonPath = path.resolve(__dirname, '..', 'public', 'podcast-transcript.json');

  // Guard: skip if file does not exist (CI without assets)
  const fileExists = fs.existsSync(jsonPath);

  if (fileExists) {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }

  it.skipIf(!fileExists)('should have a chapters array', () => {
    expect(Array.isArray(data.chapters)).toBe(true);
    expect(data.chapters.length).toBeGreaterThan(0);
  });

  it.skipIf(!fileExists)('should have a segments array', () => {
    expect(Array.isArray(data.segments)).toBe(true);
    expect(data.segments.length).toBeGreaterThan(0);
  });

  it.skipIf(!fileExists)('should have chapters with required fields', () => {
    for (const ch of data.chapters) {
      expect(ch).toHaveProperty('id');
      expect(ch).toHaveProperty('title');
      expect(ch).toHaveProperty('startTime');
      expect(ch).toHaveProperty('endTime');
      expect(ch).toHaveProperty('startSegmentId');
      expect(ch).toHaveProperty('endSegmentId');
      expect(typeof ch.id).toBe('number');
      expect(typeof ch.title).toBe('string');
      expect(typeof ch.startTime).toBe('number');
      expect(typeof ch.endTime).toBe('number');
      expect(ch.endTime).toBeGreaterThanOrEqual(ch.startTime);
      expect(ch.endSegmentId).toBeGreaterThanOrEqual(ch.startSegmentId);
    }
  });

  it.skipIf(!fileExists)('should have segments with required fields', () => {
    for (const seg of data.segments) {
      expect(seg).toHaveProperty('id');
      expect(seg).toHaveProperty('start');
      expect(seg).toHaveProperty('end');
      expect(seg).toHaveProperty('text');
      expect(typeof seg.id).toBe('number');
      expect(typeof seg.start).toBe('number');
      expect(typeof seg.end).toBe('number');
      expect(typeof seg.text).toBe('string');
      expect(seg.text.length).toBeGreaterThan(0);
      expect(seg.end).toBeGreaterThanOrEqual(seg.start);
    }
  });

  it.skipIf(!fileExists)('should have speaker field on segments (string or undefined)', () => {
    for (const seg of data.segments) {
      if (seg.speaker !== undefined) {
        expect(typeof seg.speaker).toBe('string');
        expect(seg.speaker.length).toBeGreaterThan(0);
      }
    }
  });

  it.skipIf(!fileExists)('should contain both known speakers (Kevin Owocki and James Pollack)', () => {
    const speakers = new Set(data.segments.map((s) => s.speaker).filter(Boolean));
    expect(speakers.has('Kevin Owocki')).toBe(true);
    expect(speakers.has('James Pollack')).toBe(true);
  });

  it.skipIf(!fileExists)('should have segment IDs in ascending order', () => {
    for (let i = 1; i < data.segments.length; i++) {
      expect(data.segments[i].id).toBeGreaterThan(data.segments[i - 1].id);
    }
  });

  it.skipIf(!fileExists)('should have chapter IDs in ascending order', () => {
    for (let i = 1; i < data.chapters.length; i++) {
      expect(data.chapters[i].id).toBeGreaterThan(data.chapters[i - 1].id);
    }
  });

  it.skipIf(!fileExists)('should have chapters that reference valid segment ID ranges', () => {
    const segIds = new Set(data.segments.map((s) => s.id));
    for (const ch of data.chapters) {
      expect(segIds.has(ch.startSegmentId)).toBe(true);
      expect(segIds.has(ch.endSegmentId)).toBe(true);
    }
  });

  it.skipIf(!fileExists)('should have at least 10 chapters', () => {
    expect(data.chapters.length).toBeGreaterThanOrEqual(10);
  });

  it.skipIf(!fileExists)('should have at least 100 segments', () => {
    expect(data.segments.length).toBeGreaterThanOrEqual(100);
  });
});
