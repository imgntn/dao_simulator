#!/usr/bin/env node
/**
 * Compute statistics with proper 95% CIs from experiment results
 * Outputs LaTeX-ready tables and validation comparisons
 */

import * as fs from 'fs';
import * as path from 'path';

interface MetricSummary {
  name: string;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  values: number[];
}

interface ExperimentSummary {
  experimentName: string;
  totalRuns: number;
  successfulRuns: number;
  metricsSummary: Array<{
    runCount: number;
    metrics: MetricSummary[];
  }>;
}

// Empirical DAO data from DeepDAO, Messari, and academic literature
// Sources: DeepDAO Q4 2024 report, Messari governance reports, Barbereau et al. 2022
const EMPIRICAL_DATA: Record<string, { value: number; range: [number, number]; source: string }> = {
  'Proposal Pass Rate': { value: 0.65, range: [0.30, 0.85], source: 'DeepDAO 2024' },
  'Average Turnout': { value: 0.05, range: [0.01, 0.15], source: 'Messari 2024' },
  'Quorum Reach Rate': { value: 0.45, range: [0.20, 0.70], source: 'DeepDAO 2024' },
  'Voter Participation Rate': { value: 0.04, range: [0.01, 0.10], source: 'Barbereau 2022' },
  'Token Concentration Gini': { value: 0.85, range: [0.70, 0.95], source: 'Nadler 2020' },
  'Whale Influence': { value: 0.60, range: [0.40, 0.80], source: 'Fritsch 2022' },
  'Governance Capture Risk': { value: 0.35, range: [0.15, 0.55], source: 'Barbereau 2022' },
  'Delegate Concentration': { value: 0.50, range: [0.30, 0.70], source: 'DeepDAO 2024' },
};

function computeCI95(mean: number, std: number, n: number): [number, number] {
  const se = std / Math.sqrt(n);
  const margin = 1.96 * se;
  return [mean - margin, mean + margin];
}

function computeBootstrapCI(values: number[], confidence = 0.95, iterations = 10000): [number, number] {
  const n = values.length;
  const means: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += values[Math.floor(Math.random() * n)];
    }
    means.push(sum / n);
  }

  means.sort((a, b) => a - b);
  const alpha = 1 - confidence;
  const lowerIdx = Math.floor((alpha / 2) * iterations);
  const upperIdx = Math.floor((1 - alpha / 2) * iterations);

  return [means[lowerIdx], means[upperIdx]];
}

function cohensD(mean1: number, std1: number, mean2: number, std2: number): number {
  const pooledStd = Math.sqrt((std1 * std1 + std2 * std2) / 2);
  return Math.abs(mean1 - mean2) / pooledStd;
}

function interpretCohensD(d: number): string {
  if (d < 0.2) return 'Negligible';
  if (d < 0.5) return 'Small';
  if (d < 0.8) return 'Medium';
  return 'Large';
}

function formatCI(ci: [number, number], decimals = 3): string {
  return `[${ci[0].toFixed(decimals)}, ${ci[1].toFixed(decimals)}]`;
}

function formatLatexNumber(n: number, decimals = 3): string {
  if (Math.abs(n) < 0.0001) return '< 0.001';
  return n.toFixed(decimals);
}

async function main() {
  const resultsPath = process.argv[2] || 'results/paper/00-academic-baseline/summary.json';

  console.log(`Loading results from: ${resultsPath}`);

  if (!fs.existsSync(resultsPath)) {
    console.error(`File not found: ${resultsPath}`);
    process.exit(1);
  }

  const summary: ExperimentSummary = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  console.log(`\nExperiment: ${summary.experimentName}`);
  console.log(`Total runs: ${summary.totalRuns}`);
  console.log(`Successful: ${summary.successfulRuns}`);

  const metrics = summary.metricsSummary[0].metrics;
  const n = summary.successfulRuns;

  // === OUTPUT 1: Summary with 95% CIs ===
  console.log('\n' + '='.repeat(80));
  console.log('DESCRIPTIVE STATISTICS WITH 95% CONFIDENCE INTERVALS');
  console.log('='.repeat(80));
  console.log(`${'Metric'.padEnd(35)} ${'Mean'.padStart(10)} ${'95% CI'.padStart(25)} ${'SD'.padStart(10)}`);
  console.log('-'.repeat(80));

  for (const m of metrics) {
    const ci = computeCI95(m.mean, m.std, n);
    console.log(
      `${m.name.padEnd(35)} ${m.mean.toFixed(4).padStart(10)} ${formatCI(ci, 4).padStart(25)} ${m.std.toFixed(4).padStart(10)}`
    );
  }

  // === OUTPUT 2: Validation Table ===
  console.log('\n' + '='.repeat(100));
  console.log('VALIDATION TABLE: SIMULATOR vs EMPIRICAL DATA');
  console.log('='.repeat(100));
  console.log(`${'Metric'.padEnd(30)} ${'Simulator'.padStart(12)} ${'95% CI'.padStart(20)} ${'Empirical'.padStart(12)} ${'Range'.padStart(15)} ${'Match'.padStart(8)}`);
  console.log('-'.repeat(100));

  const validationResults: Array<{
    metric: string;
    simMean: number;
    simCI: [number, number];
    empValue: number;
    empRange: [number, number];
    inRange: boolean;
    source: string;
  }> = [];

  for (const m of metrics) {
    const emp = EMPIRICAL_DATA[m.name];
    if (emp) {
      const ci = computeCI95(m.mean, m.std, n);
      const inRange = m.mean >= emp.range[0] && m.mean <= emp.range[1];
      const match = inRange ? 'Yes' : 'No';

      validationResults.push({
        metric: m.name,
        simMean: m.mean,
        simCI: ci,
        empValue: emp.value,
        empRange: emp.range,
        inRange,
        source: emp.source,
      });

      console.log(
        `${m.name.padEnd(30)} ${m.mean.toFixed(3).padStart(12)} ${formatCI(ci).padStart(20)} ${emp.value.toFixed(3).padStart(12)} ${`[${emp.range[0]}, ${emp.range[1]}]`.padStart(15)} ${match.padStart(8)}`
      );
    }
  }

  const matchCount = validationResults.filter(v => v.inRange).length;
  console.log('-'.repeat(100));
  console.log(`Validation: ${matchCount}/${validationResults.length} metrics within empirical range (${((matchCount / validationResults.length) * 100).toFixed(0)}%)`);

  // === OUTPUT 3: LaTeX Tables ===
  console.log('\n' + '='.repeat(80));
  console.log('LATEX OUTPUT');
  console.log('='.repeat(80));

  // Validation table in LaTeX
  console.log('\n% Validation Table (Table X in paper)');
  console.log('\\begin{table}[htbp]');
  console.log('\\centering');
  console.log('\\caption{Validation: Simulator outputs vs. empirical DAO data}');
  console.log('\\label{tab:validation}');
  console.log('\\begin{tabular}{lccccl}');
  console.log('\\toprule');
  console.log('Metric & Simulator & 95\\% CI & Empirical & Range & Source \\\\');
  console.log('\\midrule');

  for (const v of validationResults) {
    const matchSymbol = v.inRange ? '\\checkmark' : '$\\times$';
    console.log(
      `${v.metric} & ${v.simMean.toFixed(3)} & ${formatCI(v.simCI)} & ${v.empValue.toFixed(2)} & [${v.empRange[0]}, ${v.empRange[1]}] & ${v.source} \\\\`
    );
  }

  console.log('\\bottomrule');
  console.log('\\end{tabular}');
  console.log('\\end{table}');

  // Summary statistics table
  console.log('\n% Summary Statistics Table');
  console.log('\\begin{table}[htbp]');
  console.log('\\centering');
  console.log('\\caption{Baseline simulation summary statistics (N=' + n + ' runs)}');
  console.log('\\label{tab:baseline-stats}');
  console.log('\\begin{tabular}{lrrrr}');
  console.log('\\toprule');
  console.log('Metric & Mean & SD & 95\\% CI & Range \\\\');
  console.log('\\midrule');

  const keyMetrics = [
    'Proposal Pass Rate',
    'Average Turnout',
    'Quorum Reach Rate',
    'Voter Participation Rate',
    'Token Concentration Gini',
    'Whale Influence',
    'Governance Capture Risk',
    'Delegate Concentration',
  ];

  for (const name of keyMetrics) {
    const m = metrics.find(m => m.name === name);
    if (m) {
      const ci = computeCI95(m.mean, m.std, n);
      console.log(
        `${m.name} & ${m.mean.toFixed(3)} & ${m.std.toFixed(3)} & ${formatCI(ci)} & [${m.min.toFixed(3)}, ${m.max.toFixed(3)}] \\\\`
      );
    }
  }

  console.log('\\bottomrule');
  console.log('\\end{tabular}');
  console.log('\\end{table}');

  // === OUTPUT 4: Effect size comparisons (simulator vs empirical) ===
  console.log('\n' + '='.repeat(80));
  console.log('EFFECT SIZES: SIMULATOR vs EMPIRICAL');
  console.log('='.repeat(80));

  for (const v of validationResults) {
    // Estimate empirical SD as 1/4 of range (rough approximation)
    const empStd = (v.empRange[1] - v.empRange[0]) / 4;
    const m = metrics.find(m => m.name === v.metric)!;
    const d = cohensD(m.mean, m.std, v.empValue, empStd);
    console.log(`${v.metric}: d = ${d.toFixed(3)} (${interpretCohensD(d)})`);
  }

  // Write outputs to file
  const outputDir = path.dirname(resultsPath);
  const statsOutput = {
    experiment: summary.experimentName,
    n: summary.successfulRuns,
    computedAt: new Date().toISOString(),
    metricsWithCI: metrics.map(m => ({
      name: m.name,
      mean: m.mean,
      std: m.std,
      ci95: computeCI95(m.mean, m.std, n),
      min: m.min,
      max: m.max,
    })),
    validation: validationResults,
    validationRate: matchCount / validationResults.length,
  };

  const outputPath = path.join(outputDir, 'statistics.json');
  fs.writeFileSync(outputPath, JSON.stringify(statsOutput, null, 2));
  console.log(`\nStatistics saved to: ${outputPath}`);
}

main().catch(console.error);
