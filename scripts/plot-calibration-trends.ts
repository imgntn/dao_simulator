#!/usr/bin/env npx tsx
/**
 * Plot per-DAO calibration scores over time from history.jsonl into a single SVG.
 */

import * as path from 'path';
import { writeTrendSvg } from '../lib/research/trend-svg';

function readOpt(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return undefined;
}

function main(): void {
  const argv = process.argv.slice(2);
  const historyPath = readOpt(argv, '--history')
    ?? path.join(process.cwd(), 'results', 'validation', 'history.jsonl');
  const outPath = readOpt(argv, '--out')
    ?? path.join(process.cwd(), 'results', 'validation', 'trend.svg');

  writeTrendSvg(historyPath, outPath);
  console.log(`Trend chart: ${outPath}`);
}

main();
