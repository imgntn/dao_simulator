/**
 * Trend SVG generator
 *
 * Reads history.jsonl and produces a multi-line SVG of per-DAO score over time.
 * Stays dependency-free: SVG strings only, no recharts/canvas. The output is
 * static and viewable in any browser, which is enough for trend inspection.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ValidationRunSchema,
  type ValidationRun,
} from './baseline-schema';

const PALETTE = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
  '#98df8a', '#ff9896',
];

export interface TrendPlotOptions {
  width?: number;
  height?: number;
  padding?: number;
  title?: string;
}

const DEFAULTS: Required<TrendPlotOptions> = {
  width: 1200,
  height: 600,
  padding: 60,
  title: 'Calibration score over time',
};

export function readHistory(historyPath: string): ValidationRun[] {
  if (!fs.existsSync(historyPath)) return [];
  const raw = fs.readFileSync(historyPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const out: ValidationRun[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const validated = ValidationRunSchema.safeParse(parsed);
      if (validated.success) {
        out.push(validated.data);
      }
    } catch {
      continue;
    }
  }
  return out;
}

export function renderTrendSvg(
  runs: ValidationRun[],
  options: TrendPlotOptions = {},
): string {
  const opts: Required<TrendPlotOptions> = { ...DEFAULTS, ...options };
  const { width, height, padding, title } = opts;

  if (runs.length === 0) {
    return svgEmpty(width, height, title, 'No validation runs yet.');
  }

  const daoIds = collectDaoIds(runs);
  if (daoIds.length === 0) {
    return svgEmpty(width, height, title, 'No per-DAO results found.');
  }

  const xs = runs.map((r) => new Date(r.startedAt).getTime());
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xRange = Math.max(1, xMax - xMin);

  const yMin = 0.5;
  const yMax = 1.0;

  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const xFor = (t: number) => padding + ((t - xMin) / xRange) * plotWidth;
  const yFor = (v: number) => padding + (1 - (v - yMin) / (yMax - yMin)) * plotHeight;

  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);
  parts.push(`<text x="${width / 2}" y="${padding / 2}" text-anchor="middle" font-size="18" font-weight="600">${escapeXml(title)}</text>`);

  parts.push(`<rect x="${padding}" y="${padding}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#999" stroke-width="1"/>`);

  for (let i = 0; i <= 5; i++) {
    const v = yMin + (i / 5) * (yMax - yMin);
    const y = yFor(v);
    parts.push(`<line x1="${padding}" x2="${padding + plotWidth}" y1="${y}" y2="${y}" stroke="#eee" stroke-width="1"/>`);
    parts.push(`<text x="${padding - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${v.toFixed(2)}</text>`);
  }

  for (let i = 0; i <= 4; i++) {
    const t = xMin + (i / 4) * xRange;
    const x = xFor(t);
    parts.push(`<line x1="${x}" x2="${x}" y1="${padding}" y2="${padding + plotHeight}" stroke="#eee" stroke-width="1"/>`);
    parts.push(`<text x="${x}" y="${padding + plotHeight + 18}" text-anchor="middle" font-size="11" fill="#666">${new Date(t).toISOString().slice(0, 10)}</text>`);
  }

  daoIds.forEach((daoId, idx) => {
    const color = PALETTE[idx % PALETTE.length];
    const points: string[] = [];
    for (const run of runs) {
      const result = run.perDao[daoId];
      if (!result) continue;
      const x = xFor(new Date(run.startedAt).getTime());
      const y = yFor(result.score);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (points.length === 0) return;
    parts.push(`<polyline fill="none" stroke="${color}" stroke-width="1.6" points="${points.join(' ')}"/>`);
  });

  const legendStartX = padding;
  const legendY = padding + plotHeight + 36;
  parts.push(`<g transform="translate(${legendStartX}, ${legendY})">`);
  daoIds.forEach((daoId, idx) => {
    const color = PALETTE[idx % PALETTE.length];
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const xOff = col * 160;
    const yOff = row * 20;
    parts.push(`<rect x="${xOff}" y="${yOff}" width="12" height="12" fill="${color}"/>`);
    parts.push(`<text x="${xOff + 18}" y="${yOff + 11}" font-size="12" fill="#333">${escapeXml(daoId)}</text>`);
  });
  parts.push(`</g>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

function collectDaoIds(runs: ValidationRun[]): string[] {
  const set = new Set<string>();
  for (const run of runs) {
    for (const id of Object.keys(run.perDao)) set.add(id);
  }
  return Array.from(set).sort();
}

function svgEmpty(width: number, height: number, title: string, message: string): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<text x="${width / 2}" y="${height / 2 - 12}" text-anchor="middle" font-size="18">${escapeXml(title)}</text>`,
    `<text x="${width / 2}" y="${height / 2 + 16}" text-anchor="middle" font-size="14" fill="#666">${escapeXml(message)}</text>`,
    `</svg>`,
  ].join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function writeTrendSvg(historyPath: string, outPath: string): void {
  const runs = readHistory(historyPath);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, renderTrendSvg(runs), 'utf-8');
}
