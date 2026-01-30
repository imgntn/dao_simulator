#!/usr/bin/env node
/**
 * Generate Executive Summary
 *
 * Reads summary.json files from experiment result directories and produces
 * a structured markdown executive summary.
 *
 * Usage:
 *   npx tsx scripts/generate-executive-summary.ts <results-dir-1> [results-dir-2 ...] [--output path.md]
 */

import * as fs from 'fs';
import * as path from 'path';

interface CI95 {
  lower: number;
  upper: number;
  level: number;
}

interface MetricEntry {
  name: string;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  standardError: number;
  ci95: CI95;
  coefficientOfVariation: number;
  values?: number[];
  skewness?: number;
  iqr?: number;
}

interface MetricGroup {
  sweepValue?: number;
  runCount: number;
  metrics: MetricEntry[];
}

interface ExperimentSummary {
  experimentId: string;
  experimentName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalDurationMs: number;
  metricsSummary: MetricGroup[];
}

interface ParsedArgs {
  dirs: string[];
  output: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const dirs: string[] = [];
  let output = path.join('results', 'executive-summary.md');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      output = args[++i];
    } else if (!args[i].startsWith('-')) {
      dirs.push(args[i]);
    }
  }

  return { dirs, output };
}

function loadSummary(dir: string): ExperimentSummary | null {
  const filePath = path.join(dir, 'summary.json');
  if (!fs.existsSync(filePath)) {
    console.warn(`[exec-summary] No summary.json in ${dir}, skipping`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isSweep(summary: ExperimentSummary): boolean {
  return summary.metricsSummary.length > 1 && summary.metricsSummary[0].sweepValue !== undefined;
}

function pickKeyFinding(summary: ExperimentSummary): string {
  if (isSweep(summary)) {
    return pickSweepFinding(summary);
  }
  return pickNonSweepFinding(summary);
}

function pickSweepFinding(summary: ExperimentSummary): string {
  // Find metric with largest coefficient of variation across sweep arms
  const groups = summary.metricsSummary;
  if (groups.length === 0) return 'No data';

  const metricNames = groups[0].metrics.map((m) => m.name);
  let bestMetric = metricNames[0];
  let bestCV = 0;

  for (const name of metricNames) {
    const means = groups.map((g) => {
      const m = g.metrics.find((x) => x.name === name);
      return m ? m.mean : 0;
    });
    const avg = means.reduce((a, b) => a + b, 0) / means.length;
    if (avg === 0) continue;
    const std = Math.sqrt(means.reduce((a, b) => a + (b - avg) ** 2, 0) / means.length);
    const cv = std / Math.abs(avg);
    if (cv > bestCV) {
      bestCV = cv;
      bestMetric = name;
    }
  }

  const first = groups[0].metrics.find((m) => m.name === bestMetric);
  const last = groups[groups.length - 1].metrics.find((m) => m.name === bestMetric);
  if (!first || !last) return bestMetric;

  const sweepRange = `${groups[0].sweepValue}→${groups[groups.length - 1].sweepValue}`;
  const change = last.mean - first.mean;
  const pctChange = first.mean !== 0 ? ((change / Math.abs(first.mean)) * 100).toFixed(1) : 'N/A';
  return `${bestMetric}: ${pctChange}% change across sweep (${sweepRange})`;
}

function pickNonSweepFinding(summary: ExperimentSummary): string {
  const group = summary.metricsSummary[0];
  if (!group || group.metrics.length === 0) return 'No data';

  // Pick metric with largest CV (most "interesting")
  let best = group.metrics[0];
  for (const m of group.metrics) {
    if (m.coefficientOfVariation > best.coefficientOfVariation) {
      best = m;
    }
  }

  return `${best.name}: ${best.mean.toFixed(4)} (±${(best.ci95.upper - best.ci95.lower).toFixed(4)})`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(0);
  return `${m}m ${rem}s`;
}

function categorize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('participation') || lower.includes('calibration')) return 'Participation';
  if (lower.includes('capture') || lower.includes('mitigation')) return 'Capture Resistance';
  if (lower.includes('treasury') || lower.includes('resilience')) return 'Treasury';
  if (lower.includes('inter-dao') || lower.includes('cooperation') || lower.includes('multi-dao')) return 'Inter-DAO';
  if (lower.includes('quorum') || lower.includes('sensitivity')) return 'Governance Parameters';
  if (lower.includes('governance') || lower.includes('ablation') || lower.includes('voting')) return 'Governance';
  if (lower.includes('proposal') || lower.includes('pipeline')) return 'Proposal Pipeline';
  if (lower.includes('baseline') || lower.includes('academic')) return 'Baseline';
  return 'Other';
}

function generate(summaries: ExperimentSummary[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const totalExperiments = summaries.length;
  const totalRuns = summaries.reduce((a, s) => a + s.totalRuns, 0);
  const totalFailures = summaries.reduce((a, s) => a + s.failedRuns, 0);
  const totalDuration = summaries.reduce((a, s) => a + s.totalDurationMs, 0);

  const lines: string[] = [];
  lines.push('# Executive Summary');
  lines.push('');
  lines.push(`**Generated:** ${now}  `);
  lines.push(`**Experiments:** ${totalExperiments}  `);
  lines.push(`**Total Runs:** ${totalRuns}  `);
  lines.push(`**Failed Runs:** ${totalFailures}  `);
  lines.push(`**Total Duration:** ${formatDuration(totalDuration)}`);
  lines.push('');

  // Per-experiment table
  lines.push('## Experiment Overview');
  lines.push('');
  lines.push('| Experiment | Runs | Failed | Duration | Key Finding |');
  lines.push('|---|---|---|---|---|');
  for (const s of summaries) {
    const finding = pickKeyFinding(s);
    lines.push(
      `| ${s.experimentName} | ${s.totalRuns} | ${s.failedRuns} | ${formatDuration(s.totalDurationMs)} | ${finding} |`
    );
  }
  lines.push('');

  // Key findings grouped by theme
  const groups = new Map<string, ExperimentSummary[]>();
  for (const s of summaries) {
    const cat = categorize(s.experimentName);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(s);
  }

  lines.push('## Key Findings');
  lines.push('');
  for (const [theme, exps] of groups) {
    lines.push(`### ${theme}`);
    lines.push('');
    for (const s of exps) {
      const finding = pickKeyFinding(s);
      lines.push(`- **${s.experimentName}**: ${finding}`);
    }
    lines.push('');
  }

  // Cross-experiment insights
  lines.push('## Cross-Experiment Insights');
  lines.push('');

  // Compare baseline vs non-baseline experiments on shared metrics
  const baseline = summaries.find((s) => categorize(s.experimentName) === 'Baseline');
  const nonBaseline = summaries.filter((s) => categorize(s.experimentName) !== 'Baseline');

  if (baseline && nonBaseline.length > 0) {
    const baseMetrics = baseline.metricsSummary[0]?.metrics || [];
    const baseMap = new Map(baseMetrics.map((m) => [m.name, m]));

    lines.push('**Baseline comparisons:**');
    lines.push('');
    for (const s of nonBaseline) {
      const group = isSweep(s) ? s.metricsSummary[0] : s.metricsSummary[0];
      if (!group) continue;
      const diffs: string[] = [];
      for (const m of group.metrics) {
        const bm = baseMap.get(m.name);
        if (!bm || bm.mean === 0) continue;
        const pct = (((m.mean - bm.mean) / Math.abs(bm.mean)) * 100).toFixed(1);
        if (Math.abs(parseFloat(pct)) > 10) {
          diffs.push(`${m.name} ${parseFloat(pct) > 0 ? '+' : ''}${pct}%`);
        }
      }
      if (diffs.length > 0) {
        lines.push(`- **${s.experimentName}** vs Baseline: ${diffs.join(', ')}`);
      }
    }
    if (lines[lines.length - 1] === '') {
      lines.push('_No significant deviations from baseline detected (>10% threshold)._');
    }
  } else {
    lines.push('_No baseline experiment found for cross-experiment comparison._');
  }

  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const { dirs, output } = parseArgs(process.argv);

  if (dirs.length === 0) {
    console.error('Usage: generate-executive-summary.ts <results-dir-1> [results-dir-2 ...] [--output path.md]');
    process.exit(1);
  }

  const summaries: ExperimentSummary[] = [];
  for (const dir of dirs) {
    const s = loadSummary(dir);
    if (s) summaries.push(s);
  }

  if (summaries.length === 0) {
    console.error('[exec-summary] No valid summary.json files found');
    process.exit(1);
  }

  const md = generate(summaries);
  const outDir = path.dirname(output);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(output, md, 'utf8');
  console.log(`[exec-summary] Written ${output} (${summaries.length} experiments)`);
}

main();
