#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

type MetricSummary = {
  name: string;
  mean: number;
};

type SweepSummary = {
  sweepValue?: string | number | boolean;
  runCount: number;
  metrics: MetricSummary[];
};

type ExperimentSummary = {
  experimentName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  metricsSummary: SweepSummary[];
};

type ExperimentSpec = {
  key: string;
  title: string;
  outputName: string;
  summaryPath: string;
  focusMetrics: string[];
  narrative: string;
};

const ROOT = process.cwd();
const PLAIN_ENGLISH_DIR = path.join(ROOT, 'paper', 'plain-english');

const EXPERIMENTS: ExperimentSpec[] = [
  {
    key: 'rq1',
    title: 'RQ1 Participation Dynamics',
    outputName: 'rq1-participation.md',
    summaryPath: path.join(ROOT, 'results', 'paper', '01-calibration-participation', 'summary.json'),
    focusMetrics: ['Average Turnout', 'Voter Retention Rate', 'Quorum Reach Rate'],
    narrative: 'How participation calibration changes turnout, retention, and quorum behavior.',
  },
  {
    key: 'rq2',
    title: 'RQ2 Governance Capture Mitigation',
    outputName: 'rq2-governance-capture.md',
    summaryPath: path.join(ROOT, 'results', 'paper', '04-governance-capture-mitigations', 'summary.json'),
    focusMetrics: ['Whale Influence', 'Governance Capture Risk', 'Proposal Pass Rate'],
    narrative: 'How anti-capture mechanisms affect concentration risk and proposal throughput.',
  },
  {
    key: 'rq3',
    title: 'RQ3 Proposal Pipeline Effects',
    outputName: 'rq3-proposal-pipeline.md',
    summaryPath: path.join(ROOT, 'results', 'paper', '05-proposal-pipeline', 'summary.json'),
    focusMetrics: ['Avg Time to Decision', 'Proposal Pass Rate', 'Proposal Abandonment Rate'],
    narrative: 'How proposal process settings influence speed, throughput, and abandonment.',
  },
  {
    key: 'rq4',
    title: 'RQ4 Treasury Resilience',
    outputName: 'rq4-treasury.md',
    summaryPath: path.join(ROOT, 'results', 'paper', '06-treasury-resilience', 'summary.json'),
    focusMetrics: ['Treasury Volatility', 'Treasury Growth Rate', 'Final Treasury'],
    narrative: 'How treasury policy settings affect volatility, growth, and final reserves.',
  },
  {
    key: 'rq5',
    title: 'RQ5 Inter-DAO Cooperation',
    outputName: 'rq5-cooperation.md',
    summaryPath: path.join(ROOT, 'results', 'paper', '07-inter-dao-cooperation', 'summary.json'),
    focusMetrics: ['ecosystem.Inter-DAO Proposal Success Rate', 'ecosystem.Resource Flow Volume', 'ecosystem.Cross-DAO Approval Alignment'],
    narrative: 'How inter-DAO coordination changes proposal success and resource exchange.',
  },
  {
    key: 'rq6',
    title: 'RQ6 LLM Agent Reasoning',
    outputName: 'rq6-llm-agent-reasoning.md',
    summaryPath: path.join(ROOT, 'results', 'experiments', '12-llm-reasoning-v4', 'summary.json'),
    focusMetrics: ['LLM Vote Consistency', 'LLM Avg Latency', 'Proposal Pass Rate'],
    narrative: 'How rule-based, hybrid, and all-LLM modes trade off governance quality and latency.',
  },
];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSummary(summaryPath: string): ExperimentSummary {
  return JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as ExperimentSummary;
}

function collectMetricRows(summary: ExperimentSummary, metricName: string): Array<{ sweep: string; mean: number; runCount: number }> {
  const rows: Array<{ sweep: string; mean: number; runCount: number }> = [];
  for (const sweep of summary.metricsSummary || []) {
    const metric = (sweep.metrics || []).find((m) => m.name === metricName);
    if (!metric) continue;
    rows.push({
      sweep: String(sweep.sweepValue ?? 'default'),
      mean: Number(metric.mean ?? 0),
      runCount: Number(sweep.runCount ?? 0),
    });
  }
  return rows;
}

function weightedAverage(values: Array<{ mean: number; runCount: number }>): number {
  const total = values.reduce((sum, row) => sum + row.runCount, 0);
  if (total <= 0) return 0;
  const weighted = values.reduce((sum, row) => sum + row.mean * row.runCount, 0);
  return weighted / total;
}

function fmt(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1000) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(3);
  return value.toFixed(4);
}

function isLowerBetter(metricName: string): boolean {
  const name = metricName.toLowerCase();
  return [
    'latency',
    'volatility',
    'risk',
    'abandonment',
    'time',
    'overhead',
    'gini',
    'concentration',
    'influence',
    'vulnerability',
    'control',
  ].some((token) => name.includes(token));
}

function normalizeSweepLabel(raw: string): string {
  if (!raw.includes('=')) return raw;

  const llmMode = /llm_agent_mode=([^_]+)/.exec(raw)?.[1];
  const llmEnabled = /llm_enabled=([^_]+)/.exec(raw)?.[1];
  const llmFraction = /llm_hybrid_fraction=([^_]+)/.exec(raw)?.[1];
  if (llmMode) {
    const fields = [`mode=${llmMode}`];
    if (llmEnabled) fields.push(`enabled=${llmEnabled}`);
    if (llmFraction) fields.push(`fraction=${llmFraction}`);
    return fields.join(', ');
  }

  const matches = Array.from(raw.matchAll(/([A-Za-z0-9._-]+)=([^_]+)/g))
    .slice(0, 3)
    .map((m) => `${m[1]}=${m[2]}`);
  if (matches.length > 0) {
    return matches.join(', ');
  }
  return raw;
}

function bestRow(metricName: string, rows: Array<{ sweep: string; mean: number; runCount: number }>): { sweep: string; mean: number } | null {
  if (rows.length === 0) return null;
  const lowerBetter = isLowerBetter(metricName);
  return rows.reduce((best, row) => {
    if (lowerBetter) {
      return row.mean < best.mean ? row : best;
    }
    return row.mean > best.mean ? row : best;
  });
}

function buildExperimentDoc(spec: ExperimentSpec, summary: ExperimentSummary): string {
  const lines: string[] = [];
  lines.push(`# ${spec.title}`);
  lines.push('');
  lines.push('## The Plain English Version');
  lines.push('');
  lines.push(spec.narrative);
  lines.push('');
  lines.push(`Source experiment: \`${summary.experimentName}\``);
  lines.push(`Runs completed: **${summary.successfulRuns}/${summary.totalRuns}** (failed: ${summary.failedRuns})`);
  lines.push('');
  lines.push('## Key Takeaways');
  lines.push('');

  for (const metricName of spec.focusMetrics) {
    const rows = collectMetricRows(summary, metricName);
    const avg = weightedAverage(rows);
    const top = bestRow(metricName, rows);
    if (rows.length === 0) {
      lines.push(`- ${metricName}: not available in this run.`);
      continue;
    }
    const topText = top ? `best mode/config: \`${normalizeSweepLabel(top.sweep)}\` at ${fmt(top.mean)}` : 'best mode/config: n/a';
    lines.push(`- ${metricName}: overall average ${fmt(avg)} (${topText}).`);
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Summary file: \`${path.relative(ROOT, spec.summaryPath).replace(/\\/g, '/')}\``);
  lines.push('- Values are taken directly from the latest available summary and simplified for non-technical readers.');
  lines.push('');
  return lines.join('\n');
}

function buildMainDoc(generatedFiles: string[]): string {
  const lines: string[] = [];
  lines.push('# DAO Governance Papers (Plain English)');
  lines.push('');
  lines.push('## The Plain English Version');
  lines.push('');
  lines.push('This folder contains short, non-technical summaries of each research question paper plus the LLM reasoning paper.');
  lines.push('');
  lines.push('## Available Summaries');
  lines.push('');
  for (const file of generatedFiles) {
    if (file === '00-main-paper.md') continue;
    lines.push(`- [${file}](./${file})`);
  }
  lines.push('');
  lines.push('## Update Info');
  lines.push('');
  lines.push(`- Regenerated: ${new Date().toISOString()}`);
  lines.push('- Generated from current summary.json outputs in `results/paper/*` and `results/experiments/12-llm-reasoning-v4`.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  ensureDir(PLAIN_ENGLISH_DIR);

  const generatedFiles: string[] = [];
  for (const spec of EXPERIMENTS) {
    if (!fs.existsSync(spec.summaryPath)) {
      console.warn(`[plain-english] Skipping ${spec.key}, missing summary: ${spec.summaryPath}`);
      continue;
    }
    const summary = readSummary(spec.summaryPath);
    const content = buildExperimentDoc(spec, summary);
    const targetPath = path.join(PLAIN_ENGLISH_DIR, spec.outputName);
    fs.writeFileSync(targetPath, content);
    generatedFiles.push(spec.outputName);
    console.log(`[plain-english] Wrote ${path.relative(ROOT, targetPath).replace(/\\/g, '/')}`);
  }

  generatedFiles.sort((a, b) => a.localeCompare(b));
  const mainPath = path.join(PLAIN_ENGLISH_DIR, '00-main-paper.md');
  fs.writeFileSync(mainPath, buildMainDoc(['00-main-paper.md', ...generatedFiles]));
  console.log(`[plain-english] Wrote ${path.relative(ROOT, mainPath).replace(/\\/g, '/')}`);
}

main();
