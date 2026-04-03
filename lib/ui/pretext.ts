import { layout, layoutWithLines, prepareWithSegments, type PrepareOptions, type PreparedTextWithSegments } from '@chenglou/pretext';

const MAX_PREPARED_CACHE_ENTRIES = 2048;
const preparedCache = new Map<string, PreparedTextWithSegments>();

export const PRETEXT_FONTS = {
  simMono9: '500 9px "IBM Plex Mono", "Courier New", Courier, monospace',
  simMono10: '500 10px "IBM Plex Mono", "Courier New", Courier, monospace',
  simMono11: '500 11px "IBM Plex Mono", "Courier New", Courier, monospace',
  simSans12: '500 12px "Space Grotesk", Arial, sans-serif',
  simSans14: '600 14px "Space Grotesk", Arial, sans-serif',
  body12: '500 12px "Space Grotesk", Arial, sans-serif',
  body14: '500 14px "Space Grotesk", Arial, sans-serif',
  body15: '500 15px "Space Grotesk", Arial, sans-serif',
} as const;

export interface PretextTextLayoutOptions {
  text: string;
  font: string;
  maxWidth: number;
  lineHeight: number;
  maxLines?: number;
  whiteSpace?: PrepareOptions['whiteSpace'];
  ellipsis?: string;
}

export interface PretextTextLayoutResult {
  lines: string[];
  displayText: string;
  lineCount: number;
  displayedLineCount: number;
  truncated: boolean;
  maxLineWidth: number;
  height: number;
}

let sharedGraphemeSegmenter: Intl.Segmenter | null = null;

function getGraphemeSegmenter() {
  if (sharedGraphemeSegmenter === null) {
    sharedGraphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
  return sharedGraphemeSegmenter;
}

function trimPreparedCache() {
  while (preparedCache.size > MAX_PREPARED_CACHE_ENTRIES) {
    const oldestKey = preparedCache.keys().next().value;
    if (oldestKey === undefined) break;
    preparedCache.delete(oldestKey);
  }
}

function getCacheKey(text: string, font: string, whiteSpace: PrepareOptions['whiteSpace'] = 'normal') {
  return `${font}\u0000${whiteSpace}\u0000${text}`;
}

function getPreparedText(
  text: string,
  font: string,
  whiteSpace: PrepareOptions['whiteSpace'] = 'normal'
) {
  const cacheKey = getCacheKey(text, font, whiteSpace);
  const cached = preparedCache.get(cacheKey);
  if (cached) return cached;

  const prepared = prepareWithSegments(text, font, { whiteSpace });
  preparedCache.set(cacheKey, prepared);
  trimPreparedCache();
  return prepared;
}

function fitsOnSingleLine(
  text: string,
  font: string,
  maxWidth: number,
  whiteSpace: PrepareOptions['whiteSpace'] = 'normal'
) {
  const prepared = getPreparedText(text, font, whiteSpace);
  return layout(prepared, maxWidth, 1).lineCount <= 1;
}

function measureSingleLineWidth(
  text: string,
  font: string,
  maxWidth: number,
  whiteSpace: PrepareOptions['whiteSpace'] = 'normal'
) {
  if (text.length === 0) return 0;
  const prepared = getPreparedText(text, font, whiteSpace);
  const measured = layoutWithLines(prepared, maxWidth, 1);
  return measured.lines[0]?.width ?? 0;
}

function truncateToSingleLine(
  text: string,
  font: string,
  maxWidth: number,
  whiteSpace: PrepareOptions['whiteSpace'] = 'normal',
  ellipsis = '...'
) {
  const normalized = whiteSpace === 'pre-wrap' ? text.replace(/\s+$/u, '') : text.trimEnd();
  if (normalized.length === 0) return ellipsis;
  if (fitsOnSingleLine(`${normalized}${ellipsis}`, font, maxWidth, whiteSpace)) {
    return `${normalized}${ellipsis}`;
  }

  const graphemes = Array.from(getGraphemeSegmenter().segment(normalized), ({ segment }) => segment);
  let low = 0;
  let high = graphemes.length;
  let best = ellipsis;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const prefix = graphemes.slice(0, mid).join('').trimEnd();
    const candidate = prefix.length > 0 ? `${prefix}${ellipsis}` : ellipsis;
    if (fitsOnSingleLine(candidate, font, maxWidth, whiteSpace)) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

export function getPretextTextLayout({
  text,
  font,
  maxWidth,
  lineHeight,
  maxLines,
  whiteSpace = 'normal',
  ellipsis = '...',
}: PretextTextLayoutOptions): PretextTextLayoutResult {
  if (text.length === 0 || maxWidth <= 0) {
    return {
      lines: text.length === 0 ? [] : [text],
      displayText: text,
      lineCount: text.length === 0 ? 0 : 1,
      displayedLineCount: text.length === 0 ? 0 : 1,
      truncated: false,
      maxLineWidth: 0,
      height: text.length === 0 ? 0 : lineHeight,
    };
  }

  const prepared = getPreparedText(text, font, whiteSpace);
  const laidOut = layoutWithLines(prepared, maxWidth, lineHeight);
  const fullLines = laidOut.lines.map((line) => line.text);
  const fullMaxLineWidth = laidOut.lines.reduce((max, line) => Math.max(max, line.width), 0);

  if (!maxLines || laidOut.lineCount <= maxLines) {
    return {
      lines: fullLines,
      displayText: fullLines.join('\n'),
      lineCount: laidOut.lineCount,
      displayedLineCount: laidOut.lineCount,
      truncated: false,
      maxLineWidth: fullMaxLineWidth,
      height: laidOut.height,
    };
  }

  const visibleLines = fullLines.slice(0, maxLines);
  visibleLines[maxLines - 1] = truncateToSingleLine(
    visibleLines[maxLines - 1],
    font,
    maxWidth,
    whiteSpace,
    ellipsis
  );

  const visibleMaxLineWidth = visibleLines.reduce(
    (max, line) => Math.max(max, measureSingleLineWidth(line, font, maxWidth, whiteSpace)),
    0
  );

  return {
    lines: visibleLines,
    displayText: visibleLines.join('\n'),
    lineCount: laidOut.lineCount,
    displayedLineCount: maxLines,
    truncated: true,
    maxLineWidth: visibleMaxLineWidth,
    height: maxLines * lineHeight,
  };
}
