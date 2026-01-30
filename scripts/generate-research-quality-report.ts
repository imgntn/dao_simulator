#!/usr/bin/env ts-node
/**
 * Research Quality Report Generator for DAO Simulation Results
 *
 * Generates a comprehensive markdown report from simulation experiment results,
 * including statistical analysis, distribution diagnostics, and recommendations.
 *
 * Note: This is distinct from the academic paper generator (paper-update.ts)
 * which produces the ArXiv publication. This report focuses on data quality
 * and statistical validity of simulation results.
 *
 * Usage:
 *   npx ts-node scripts/generate-research-quality-report.ts <results-directory> [output-file]
 *
 * Example:
 *   npx ts-node scripts/generate-research-quality-report.ts results/academic-100k-validation
 *   npx ts-node scripts/generate-research-quality-report.ts results/my-experiment report.md
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface MetricStats {
  sweepValue: string;
  runCount: number;
  mean: number;
  median: number;
  std: number;
  se: number;
  ci95Lower: number;
  ci95Upper: number;
  bootstrapCi95Lower?: number;
  bootstrapCi95Upper?: number;
  min: number;
  max: number;
  iqr?: number;
  cv: number;
}

interface SignificanceResult {
  sweepValue1: string;
  sweepValue2: string;
  metric: string;
  tStatistic: number;
  df: number;
  pValue: number;
  significant: boolean;
  cohensD: number;
  effectInterpretation: string;
}

interface AnovaResult {
  metric: string;
  fStatistic: number;
  dfBetween: number;
  dfWithin: number;
  pValue: number;
  significant: boolean;
}

interface PowerAnalysisResult {
  currentRunsPerConfig: number;
  recommendedRuns: number;
  currentPower: number;
  minimumEffectDetectable: number;
}

interface ParsedResults {
  stats: Map<string, MetricStats[]>;  // metric name -> stats per sweep value
  significance: SignificanceResult[];
  anova: AnovaResult[];
  power: PowerAnalysisResult;
  recommendations: string[];
  experimentName: string;
  totalRuns: number;
  sweepValues: string[];
  sweepParameter: string;
}

// Metric categories for organization
const METRIC_CATEGORIES: Record<string, string[]> = {
  'Basic Outcome': [
    'Proposal Pass Rate',
    'Average Turnout',
    'Final Treasury',
    'Final Token Price',
    'Final Member Count',
    'Total Proposals',
  ],
  'Governance Efficiency': [
    'Quorum Reach Rate',
    'Avg Margin of Victory',
    'Avg Time to Decision',
    'Proposal Abandonment Rate',
    'Proposal Rejection Rate',
    'Governance Overhead',
  ],
  'Participation Quality': [
    'Unique Voter Count',
    'Voter Participation Rate',
    'Voter Concentration Gini',
    'Delegate Concentration',
    'Avg Votes Per Proposal',
    'Voter Retention Rate',
    'Voting Power Utilization',
  ],
  'Economic Health': [
    'Treasury Volatility',
    'Treasury Growth Rate',
    'Staking Participation',
    'Token Concentration Gini',
    'Avg Member Wealth',
    'Wealth Mobility',
  ],
  'Attack Resistance': [
    'Whale Influence',
    'Whale Proposal Rate',
    'Governance Capture Risk',
    'Vote Buying Vulnerability',
    'Single Entity Control',
    'Collusion Threshold',
  ],
  'Temporal Dynamics': [
    'Participation Trend',
    'Treasury Trend',
    'Member Growth Rate',
    'Proposal Rate',
    'Governance Activity Index',
  ],
  'Final State': [
    'Final Gini',
    'Final Reputation Gini',
  ],
};

// Thresholds for flagging issues
const QUALITY_THRESHOLDS = {
  highCV: 0.5,           // CV > 50% is high variability
  veryHighCV: 1.0,       // CV > 100% is very high variability
  highSkewness: 2.0,     // |skewness| > 2 suggests non-normal
  veryHighSkewness: 3.0, // |skewness| > 3 is very skewed
  minRunsForPower: 30,   // Minimum runs for 80% power at d=0.5
  largeEffectSize: 0.8,  // Cohen's d threshold
  veryLargeEffectSize: 1.2,
};

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n').filter(line => !line.startsWith('#'));
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = lines[i].split(',');
    let values = rawValues;
    if (rawValues.length > headers.length) {
      const runCountCandidate = rawValues[1];
      const runCountNumeric = runCountCandidate !== undefined && runCountCandidate !== '' && !Number.isNaN(Number(runCountCandidate));
      if (!runCountNumeric) {
        // Extra commas are in sweep_value; merge into first column.
        values = [
          rawValues.slice(0, rawValues.length - headers.length + 1).join(','),
          ...rawValues.slice(rawValues.length - headers.length + 1),
        ];
      } else {
        // Extra columns are beyond the header (e.g., additional DAO metrics); truncate.
        values = rawValues.slice(0, headers.length);
      }
    }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseStatsCSV(content: string): Map<string, MetricStats[]> {
  const rows = parseCSV(content);
  const stats = new Map<string, MetricStats[]>();

  // Get all metric names from base stats headers
  const headers = content.split('\n')[0].split(',');
  const metricNames = new Set<string>();

  for (const header of headers) {
    if (header.includes('_bootstrap_ci95_')) {
      continue;
    }
    const match = header.match(/^(.+?)_(mean|median|std|se|ci95_lower|ci95_upper|min|max|cv|iqr)$/);
    if (match) {
      metricNames.add(match[1]);
    }
  }

  for (const metricName of metricNames) {
    const metricStats: MetricStats[] = [];

    for (const row of rows) {
      metricStats.push({
        sweepValue: row['sweep_value'],
        runCount: parseFloat(row['run_count']) || 0,
        mean: parseFloat(row[`${metricName}_mean`]) || 0,
        median: parseFloat(row[`${metricName}_median`]) || 0,
        std: parseFloat(row[`${metricName}_std`]) || 0,
        se: parseFloat(row[`${metricName}_se`]) || 0,
        ci95Lower: parseFloat(row[`${metricName}_ci95_lower`]) || 0,
        ci95Upper: parseFloat(row[`${metricName}_ci95_upper`]) || 0,
        bootstrapCi95Lower: parseFloat(row[`${metricName}_bootstrap_ci95_lower`]) || undefined,
        bootstrapCi95Upper: parseFloat(row[`${metricName}_bootstrap_ci95_upper`]) || undefined,
        min: parseFloat(row[`${metricName}_min`]) || 0,
        max: parseFloat(row[`${metricName}_max`]) || 0,
        iqr: parseFloat(row[`${metricName}_iqr`]) || undefined,
        cv: parseFloat(row[`${metricName}_cv`]) || 0,
      });
    }

    stats.set(metricName, metricStats);
  }

  return stats;
}

function parseSignificanceCSV(content: string): { significance: SignificanceResult[], anova: AnovaResult[], power: PowerAnalysisResult } {
  const sections = content.split(/^#\s*/m);

  let significance: SignificanceResult[] = [];
  let anova: AnovaResult[] = [];
  let power: PowerAnalysisResult = {
    currentRunsPerConfig: 0,
    recommendedRuns: 0,
    currentPower: 0,
    minimumEffectDetectable: 0,
  };

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;

    const header = lines[0].trim();

    if (header.includes('Pairwise T-Test')) {
      const rows = parseCSV(lines.slice(1).join('\n'));
      significance = rows.map(row => ({
        sweepValue1: row['sweep_value_1'],
        sweepValue2: row['sweep_value_2'],
        metric: row['metric'],
        tStatistic: parseFloat(row['t_statistic']) || 0,
        df: parseFloat(row['df']) || 0,
        pValue: parseFloat(row['p_value']) || 0,
        significant: row['significant'] === 'true',
        cohensD: parseFloat(row['cohens_d']) || 0,
        effectInterpretation: row['effect_interpretation'] || 'negligible',
      }));
    } else if (header.includes('ANOVA')) {
      const rows = parseCSV(lines.slice(1).join('\n'));
      anova = rows.map(row => ({
        metric: row['metric'],
        fStatistic: parseFloat(row['f_statistic']) || 0,
        dfBetween: parseFloat(row['df_between']) || 0,
        dfWithin: parseFloat(row['df_within']) || 0,
        pValue: parseFloat(row['p_value']) || 0,
        significant: row['significant'] === 'true',
      }));
    } else if (header.includes('Power Analysis')) {
      for (const line of lines.slice(1)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [key, value] = trimmed.split(',');
        if (!key || value === undefined) continue;
        const parsed = parseFloat(value);
        if (key === 'current_runs_per_config') power.currentRunsPerConfig = parsed;
        if (key === 'recommended_runs') power.recommendedRuns = parsed;
        if (key === 'current_power') power.currentPower = parsed;
        if (key === 'minimum_effect_detectable') power.minimumEffectDetectable = parsed;
      }
    }
  }

  return { significance, anova, power };
}

function parseResults(resultsDir: string): ParsedResults {
  const statsPath = path.join(resultsDir, 'stats.csv');
  const significancePath = path.join(resultsDir, 'significance.csv');
  const recommendationsPath = path.join(resultsDir, 'recommendations.txt');
  const summaryPath = path.join(resultsDir, 'summary.json');

  let stats = new Map<string, MetricStats[]>();
  let significance: SignificanceResult[] = [];
  let anova: AnovaResult[] = [];
  let power: PowerAnalysisResult = {
    currentRunsPerConfig: 0,
    recommendedRuns: 0,
    currentPower: 0,
    minimumEffectDetectable: 0,
  };
  let recommendations: string[] = [];

  // Parse stats
  if (fs.existsSync(statsPath)) {
    stats = parseStatsCSV(fs.readFileSync(statsPath, 'utf-8'));
  }

  // Parse significance
  if (fs.existsSync(significancePath)) {
    const parsed = parseSignificanceCSV(fs.readFileSync(significancePath, 'utf-8'));
    significance = parsed.significance;
    anova = parsed.anova;
    power = parsed.power;
  }

  // Parse recommendations
  if (fs.existsSync(recommendationsPath)) {
    recommendations = fs.readFileSync(recommendationsPath, 'utf-8')
      .split('\n')
      .map(l => l.replace(/^\s*\d+→/, '').trim())
      .filter(l => l.length > 0);
  }

  // Extract metadata
  const sweepValues: string[] = [];
  let totalRuns = 0;
  const firstMetric = stats.values().next().value;
  if (firstMetric) {
    for (const s of firstMetric) {
      sweepValues.push(s.sweepValue);
      totalRuns += s.runCount;
    }
  }
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      if (typeof summary.totalRuns === 'number') {
        totalRuns = summary.totalRuns;
      }
    } catch {
      // ignore summary parse errors
    }
  }

  // Try to infer experiment name from directory
  const experimentName = path.basename(resultsDir);

  // Try to infer sweep parameter from significance results
  let sweepParameter = 'Sweep Value';
  const nameLower = experimentName.toLowerCase();
  if (nameLower.includes('quorum')) {
    sweepParameter = 'Quorum Percentage';
  } else if (nameLower.includes('participation')) {
    sweepParameter = 'Voting Activity';
  } else if (nameLower.includes('voting-period')) {
    sweepParameter = 'Voting Period (Days)';
  } else if (nameLower.includes('threshold')) {
    sweepParameter = 'Threshold';
  }

  return {
    stats,
    significance,
    anova,
    power,
    recommendations,
    experimentName,
    totalRuns,
    sweepValues,
    sweepParameter,
  };
}

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

interface MetricDiagnostic {
  metric: string;
  category: string;
  issues: string[];
  severity: 'ok' | 'warning' | 'critical';
  meanAcrossSweeps: number;
  cvAcrossSweeps: number;
  significantEffect: boolean;
  effectSize: number;
  effectInterpretation: string;
}

function diagnoseMetric(
  metricName: string,
  stats: MetricStats[],
  anovaResult: AnovaResult | undefined,
  significanceResults: SignificanceResult[]
): MetricDiagnostic {
  const issues: string[] = [];
  let severity: 'ok' | 'warning' | 'critical' = 'ok';

  // Find category
  let category = 'Other';
  for (const [cat, metrics] of Object.entries(METRIC_CATEGORIES)) {
    if (metrics.includes(metricName)) {
      category = cat;
      break;
    }
  }

  // Calculate aggregate statistics
  const allMeans = stats.map(s => s.mean);
  const meanAcrossSweeps = allMeans.reduce((a, b) => a + b, 0) / allMeans.length;
  const allCVs = stats.map(s => s.cv);
  const avgCV = allCVs.reduce((a, b) => a + b, 0) / allCVs.length;

  // Check for high variability
  const maxCV = Math.max(...allCVs);
  if (maxCV > QUALITY_THRESHOLDS.veryHighCV) {
    issues.push(`Very high variability (CV=${(maxCV * 100).toFixed(1)}%). Distribution may be non-normal or parameter has high stochasticity.`);
    severity = 'critical';
  } else if (maxCV > QUALITY_THRESHOLDS.highCV) {
    issues.push(`High variability (CV=${(maxCV * 100).toFixed(1)}%). Consider more runs or controlled conditions.`);
    if (severity === 'ok') severity = 'warning';
  }

  // Check for skewness (infer from median vs mean)
  for (const s of stats) {
    if (s.mean !== 0) {
      const skewIndicator = (s.mean - s.median) / (s.std || 1);
      if (Math.abs(skewIndicator) > 0.5) {
        issues.push(`Non-symmetric distribution at sweep=${s.sweepValue} (mean=${s.mean.toFixed(4)}, median=${s.median.toFixed(4)}). Consider bootstrap CI.`);
        if (severity === 'ok') severity = 'warning';
        break;  // Only report once
      }
    }
  }

  // Check for floor/ceiling effects
  const allZero = stats.every(s => s.mean === 0 && s.std === 0);
  const allConstant = stats.every(s => s.std === 0);
  if (allZero) {
    issues.push('Metric is always zero across all conditions. May indicate unimplemented feature or degenerate case.');
    if (severity === 'ok') severity = 'warning';
  } else if (allConstant) {
    issues.push('Metric has zero variance. Value is deterministic or sample is homogeneous.');
  }

  // Check ANOVA results
  let significantEffect = false;
  let effectSize = 0;
  let effectInterpretation = 'negligible';

  if (anovaResult) {
    significantEffect = anovaResult.significant;
    if (significantEffect && anovaResult.fStatistic > 100) {
      issues.push(`Very strong treatment effect (F=${anovaResult.fStatistic.toFixed(1)}, p<0.001).`);
    }
  }

  // Get max effect size from pairwise comparisons
  const metricSignificance = significanceResults.filter(s => s.metric === metricName);
  for (const sig of metricSignificance) {
    if (Math.abs(sig.cohensD) > Math.abs(effectSize)) {
      effectSize = sig.cohensD;
      effectInterpretation = sig.effectInterpretation;
    }
  }

  if (Math.abs(effectSize) > QUALITY_THRESHOLDS.veryLargeEffectSize) {
    if (!issues.some(i => i.includes('treatment effect'))) {
      issues.push(`Very large effect size (d=${effectSize.toFixed(2)}). This metric is highly sensitive to the sweep parameter.`);
    }
  }

  return {
    metric: metricName,
    category,
    issues,
    severity,
    meanAcrossSweeps,
    cvAcrossSweeps: avgCV,
    significantEffect,
    effectSize,
    effectInterpretation,
  };
}

function identifyKeyFindings(results: ParsedResults): string[] {
  const findings: string[] = [];

  // Find metrics with significant ANOVA
  const significantANOVA = results.anova.filter(a => a.significant);

  if (significantANOVA.length === 0) {
    findings.push('No metrics showed statistically significant variation across sweep values.');
  } else {
    // Sort by F-statistic
    significantANOVA.sort((a, b) => b.fStatistic - a.fStatistic);

    for (const a of significantANOVA.slice(0, 5)) {
      const stats = results.stats.get(a.metric);
      if (stats) {
        const minMean = Math.min(...stats.map(s => s.mean));
        const maxMean = Math.max(...stats.map(s => s.mean));
        const minSweep = stats.find(s => s.mean === minMean)?.sweepValue;
        const maxSweep = stats.find(s => s.mean === maxMean)?.sweepValue;

        findings.push(
          `**${a.metric}**: Significant effect (F=${a.fStatistic.toFixed(1)}, p<0.001). ` +
          `Ranges from ${minMean.toFixed(4)} (at ${results.sweepParameter}=${minSweep}) to ${maxMean.toFixed(4)} (at ${results.sweepParameter}=${maxSweep}).`
        );
      }
    }
  }

  // Find invariant metrics (no significant effect)
  const invariantCount = results.anova.filter(a => !a.significant).length;
  if (invariantCount > 0) {
    findings.push(`${invariantCount} metrics showed no significant variation across ${results.sweepParameter} values.`);
  }

  return findings;
}

function identifyDataQualityIssues(results: ParsedResults): MetricDiagnostic[] {
  const diagnostics: MetricDiagnostic[] = [];

  for (const [metricName, stats] of results.stats) {
    const anovaResult = results.anova.find(a => a.metric === metricName);
    const diagnostic = diagnoseMetric(metricName, stats, anovaResult, results.significance);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateExecutiveSummary(results: ParsedResults, diagnostics: MetricDiagnostic[]): string {
  const criticalIssues = diagnostics.filter(d => d.severity === 'critical');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  const significantEffects = results.anova.filter(a => a.significant);

  let summary = `## Executive Summary

**Experiment:** ${results.experimentName}
**Total Runs:** ${results.totalRuns.toLocaleString()}
**Runs per Configuration:** ${results.power.currentRunsPerConfig.toLocaleString()}
**Sweep Values:** ${results.sweepValues.join(', ')}
**Statistical Power:** ${(results.power.currentPower * 100).toFixed(0)}%
**Metrics Analyzed:** ${results.stats.size}

### Overall Quality Assessment

`;

  if (criticalIssues.length === 0 && warnings.length === 0) {
    summary += `✅ **Good** - No critical data quality issues detected.\n\n`;
  } else if (criticalIssues.length === 0) {
    summary += `⚠️ **Acceptable with Caveats** - ${warnings.length} warning(s) detected.\n\n`;
  } else {
    summary += `❌ **Issues Detected** - ${criticalIssues.length} critical issue(s), ${warnings.length} warning(s).\n\n`;
  }

  summary += `### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | ${significantEffects.length} of ${results.anova.length} metrics |
| Critical Issues | ${criticalIssues.length} |
| Warnings | ${warnings.length} |
| Minimum Effect Detectable | d = ${results.power.minimumEffectDetectable.toFixed(3)} |

`;

  return summary;
}

function generateKeyFindings(results: ParsedResults): string {
  const findings = identifyKeyFindings(results);

  let section = `## Key Findings

`;

  for (let i = 0; i < findings.length; i++) {
    section += `${i + 1}. ${findings[i]}\n\n`;
  }

  return section;
}

function generateMetricTable(results: ParsedResults, category: string, metrics: string[]): string {
  let table = `### ${category}

| Metric | ${results.sweepValues.map(v => `${results.sweepParameter}=${v}`).join(' | ')} | Significant | Effect |
|--------|${results.sweepValues.map(() => '------').join('|')}|-------------|--------|
`;

  for (const metricName of metrics) {
    const stats = results.stats.get(metricName);
    const anova = results.anova.find(a => a.metric === metricName);
    const maxEffect = results.significance
      .filter(s => s.metric === metricName)
      .reduce((max, s) => Math.abs(s.cohensD) > Math.abs(max) ? s.cohensD : max, 0);

    if (stats) {
      const values = stats.map(s => {
        if (s.mean === 0 && s.std === 0) return '0';
        if (Math.abs(s.mean) < 0.001) return s.mean.toExponential(2);
        if (Math.abs(s.mean) > 1000) return s.mean.toFixed(0);
        return s.mean.toFixed(4);
      });

      const sigMarker = anova?.significant ? '✓' : '';
      const effectStr = maxEffect !== 0 ? maxEffect.toFixed(2) : '-';

      table += `| ${metricName} | ${values.join(' | ')} | ${sigMarker} | ${effectStr} |\n`;
    }
  }

  table += '\n';
  return table;
}

function generateCategoryAnalysis(results: ParsedResults): string {
  let section = `## Metric Analysis by Category

`;

  for (const [category, metrics] of Object.entries(METRIC_CATEGORIES)) {
    const availableMetrics = metrics.filter(m => results.stats.has(m));
    if (availableMetrics.length > 0) {
      section += generateMetricTable(results, category, availableMetrics);
    }
  }

  // Add any uncategorized metrics
  const categorizedMetrics = new Set(Object.values(METRIC_CATEGORIES).flat());
  const uncategorized: string[] = [];
  for (const metricName of results.stats.keys()) {
    if (!categorizedMetrics.has(metricName)) {
      uncategorized.push(metricName);
    }
  }

  if (uncategorized.length > 0) {
    section += generateMetricTable(results, 'Other Metrics', uncategorized);
  }

  return section;
}

function generateDistributionAnalysis(results: ParsedResults, diagnostics: MetricDiagnostic[]): string {
  let section = `## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
`;

  const highVarMetrics = new Set<string>();

  for (const [metricName, stats] of results.stats) {
    for (const s of stats) {
      if (s.cv > QUALITY_THRESHOLDS.highCV) {
        highVarMetrics.add(metricName);
        const cvPct = (s.cv * 100).toFixed(1);
        const severity = s.cv > QUALITY_THRESHOLDS.veryHighCV ? '🔴 Critical' : '🟡 Warning';
        section += `| ${metricName} | ${s.sweepValue} | ${s.mean.toFixed(4)} | ${s.std.toFixed(4)} | ${cvPct}% | ${severity} |\n`;
      }
    }
  }

  if (highVarMetrics.size === 0) {
    section += `| (none) | - | - | - | - | - |\n`;
  }

  section += `
### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
`;

  let hasSkewed = false;
  for (const [metricName, stats] of results.stats) {
    for (const s of stats) {
      if (s.mean !== 0 && s.std > 0) {
        const skewIndicator = (s.mean - s.median) / s.std;
        if (Math.abs(skewIndicator) > 0.5) {
          hasSkewed = true;
          const direction = skewIndicator > 0 ? 'Right-skewed' : 'Left-skewed';
          section += `| ${metricName} | ${s.sweepValue} | ${s.mean.toFixed(4)} | ${s.median.toFixed(4)} | ${direction} (${skewIndicator.toFixed(2)}) |\n`;
        }
      }
    }
  }

  if (!hasSkewed) {
    section += `| (none) | - | - | - | - |\n`;
  }

  section += `
### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
`;

  let hasConstant = false;
  for (const [metricName, stats] of results.stats) {
    const allZero = stats.every(s => s.mean === 0 && s.std === 0);
    const allConstant = stats.every(s => s.std === 0) && !allZero;

    if (allZero) {
      hasConstant = true;
      section += `| ${metricName} | 0 | Always zero - may be unimplemented |\n`;
    } else if (allConstant) {
      hasConstant = true;
      section += `| ${metricName} | ${stats[0].mean.toFixed(4)} | Deterministic value |\n`;
    }
  }

  if (!hasConstant) {
    section += `| (none) | - | - |\n`;
  }

  section += '\n';
  return section;
}

function generateTreasuryAnalysis(results: ParsedResults): string {
  const treasuryStats = results.stats.get('Final Treasury');
  const treasuryVolatility = results.stats.get('Treasury Volatility');
  const treasuryGrowth = results.stats.get('Treasury Growth Rate');
  const treasuryTrend = results.stats.get('Treasury Trend');

  if (!treasuryStats) {
    return '';
  }

  let section = `## Treasury Distribution Deep Dive

The treasury shows high variability which warrants special attention.

### Treasury Statistics by ${results.sweepParameter}

| ${results.sweepParameter} | Mean | Median | Std | CV | Min | Max | 95% CI |
|--------|------|--------|-----|----|----|-----|--------|
`;

  for (const s of treasuryStats) {
    const cvPct = (s.cv * 100).toFixed(1);
    section += `| ${s.sweepValue} | ${s.mean.toFixed(0)} | ${s.median.toFixed(0)} | ${s.std.toFixed(0)} | ${cvPct}% | ${s.min.toFixed(0)} | ${s.max.toFixed(0)} | [${s.ci95Lower.toFixed(0)}, ${s.ci95Upper.toFixed(0)}] |\n`;
  }

  // Analysis
  section += `
### Treasury Distribution Analysis

`;

  const avgCV = treasuryStats.reduce((sum, s) => sum + s.cv, 0) / treasuryStats.length;

  if (avgCV > 1.0) {
    section += `**🔴 Critical Issue:** Treasury CV averages ${(avgCV * 100).toFixed(0)}%, indicating:

1. **High Stochasticity**: Treasury outcomes are highly dependent on random events (proposal success/failure timing)
2. **Right-Skewed Distribution**: Mean (${treasuryStats[0].mean.toFixed(0)}) >> Median (${treasuryStats[0].median.toFixed(0)}) suggests occasional very high values
3. **Statistical Implications**:
   - Standard t-tests may not be valid
   - Use bootstrap confidence intervals for inference
   - Consider log-transform for analysis

`;
  }

  // Add related metrics
  section += `### Related Treasury Metrics

| Metric | ${results.sweepValues.map(v => `${results.sweepParameter}=${v}`).join(' | ')} |
|--------|${results.sweepValues.map(() => '------').join('|')}|
`;

  if (treasuryVolatility) {
    section += `| Treasury Volatility | ${treasuryVolatility.map(s => s.mean.toFixed(4)).join(' | ')} |\n`;
  }
  if (treasuryGrowth) {
    section += `| Treasury Growth Rate | ${treasuryGrowth.map(s => s.mean.toFixed(4)).join(' | ')} |\n`;
  }
  if (treasuryTrend) {
    section += `| Treasury Trend | ${treasuryTrend.map(s => s.mean.toFixed(2)).join(' | ')} |\n`;
  }

  section += `
### Potential Causes of Treasury Variability

1. **Proposal Pass Rate Effect**: At low quorum, ~9% of proposals pass. Each passed proposal may have significant treasury impact.

2. **Compounding Effects**: Treasury changes compound over simulation steps, amplifying initial differences.

3. **Staking Interest Bug** (from code review): Interest may compound per-step rather than per-year, causing exponential growth in some runs.

4. **Initial Conditions**: Small variations in early proposal outcomes cascade into large final differences.

### Recommendations

`;

  if (avgCV > 1.0) {
    section += `- **Use median** instead of mean for central tendency reporting
- **Use bootstrap CI** for confidence intervals (already recommended in results)
- **Consider longer runs** or **more controlled initial conditions**
- **Investigate** the staking interest implementation for compounding bugs
- **Log-transform** treasury values before parametric analysis
`;
  } else {
    section += `- Treasury variability is within acceptable bounds
- Standard parametric tests should be valid
`;
  }

  section += '\n';
  return section;
}

function generateSignificanceAnalysis(results: ParsedResults): string {
  let section = `## Statistical Significance Analysis

### ANOVA Results (Overall Effect of ${results.sweepParameter})

| Metric | F-Statistic | df | p-value | Significant |
|--------|-------------|-----|---------|-------------|
`;

  // Sort by F-statistic
  const sortedAnova = [...results.anova].sort((a, b) => b.fStatistic - a.fStatistic);

  for (const a of sortedAnova) {
    const pStr = a.pValue < 0.001 ? '<0.001' : a.pValue.toFixed(4);
    const sigMarker = a.significant ? '✓ **Yes**' : 'No';
    section += `| ${a.metric} | ${a.fStatistic.toFixed(2)} | (${a.dfBetween}, ${a.dfWithin}) | ${pStr} | ${sigMarker} |\n`;
  }

  // Pairwise comparisons for significant metrics
  const significantMetrics = results.anova.filter(a => a.significant).map(a => a.metric);

  if (significantMetrics.length > 0) {
    section += `
### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
`;

    for (const metric of significantMetrics) {
      const comparisons = results.significance.filter(s => s.metric === metric && s.significant);
      for (const c of comparisons) {
        section += `| ${metric} | ${c.sweepValue1} vs ${c.sweepValue2} | ${c.tStatistic.toFixed(2)} | ${c.cohensD.toFixed(2)} | ${c.effectInterpretation} |\n`;
      }
    }
  }

  section += '\n';
  return section;
}

function generatePowerAnalysis(results: ParsedResults): string {
  return `## Power Analysis

| Metric | Value |
|--------|-------|
| Current Runs per Config | ${results.power.currentRunsPerConfig.toLocaleString()} |
| Recommended Runs | ${results.power.recommendedRuns.toLocaleString()} |
| Current Power | ${(results.power.currentPower * 100).toFixed(1)}% |
| Minimum Detectable Effect | d = ${results.power.minimumEffectDetectable.toFixed(4)} |

**Interpretation:**
${results.power.currentPower >= 0.8
  ? `✅ Sample size is adequate. With ${results.power.currentRunsPerConfig.toLocaleString()} runs per configuration, the study has ${(results.power.currentPower * 100).toFixed(0)}% power to detect effects as small as d = ${results.power.minimumEffectDetectable.toFixed(3)}.`
  : `⚠️ Consider increasing sample size to ${results.power.recommendedRuns} runs per configuration for 80% power to detect medium effects (d = 0.5).`
}

`;
}

function generateRecommendations(results: ParsedResults, diagnostics: MetricDiagnostic[]): string {
  let section = `## Recommendations

### Data Quality Improvements

`;

  const critical = diagnostics.filter(d => d.severity === 'critical');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  if (critical.length > 0) {
    section += `#### Critical (Must Address)\n\n`;
    for (const d of critical) {
      section += `- **${d.metric}**: ${d.issues.join(' ')}\n`;
    }
    section += '\n';
  }

  if (warnings.length > 0) {
    section += `#### Warnings (Should Address)\n\n`;
    const shown = new Set<string>();
    for (const d of warnings) {
      if (!shown.has(d.metric)) {
        section += `- **${d.metric}**: ${d.issues[0]}\n`;
        shown.add(d.metric);
      }
    }
    section += '\n';
  }

  section += `### Simulation Improvements

Based on the code review and these results:

1. **Implement Voting Power Snapshots**: Current live-balance voting allows manipulation
2. **Fix Quorum Calculation**: Should check total participation, not just votes-for
3. **Add Seed Reset**: Ensure deterministic reproducibility between runs
4. **Fix Staking Interest**: Compound annually, not per-step
5. **Implement Delegation Chains**: Required for realistic high-quorum scenarios

### Statistical Improvements

1. **Use Bootstrap CI** for non-normal metrics (Treasury, Pass Rate at low quorum)
2. **Report Median** alongside mean for skewed distributions
3. **Consider Log-Transform** for treasury analysis
4. **Run Multiple Seeds** and report aggregated results

`;

  return section;
}

function generateMethodology(results: ParsedResults): string {
  return `## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** ${results.sweepParameter} (${results.sweepValues.length} levels: ${results.sweepValues.join(', ')})
- **Dependent Variables:** ${results.stats.size} governance metrics
- **Replication:** ${results.power.currentRunsPerConfig.toLocaleString()} simulation runs per configuration
- **Total Runs:** ${results.totalRuns.toLocaleString()}

### Statistical Methods

- **Descriptive Statistics:** Mean, median, standard deviation, coefficient of variation
  - **Confidence Intervals:** 95% CI using t-distribution (bootstrap CI reported when available)
- **Omnibus Test:** One-way ANOVA for each metric
- **Post-hoc Comparisons:** Welch's t-test with effect size (Cohen's d)
- **Effect Size Interpretation:**
  - Negligible: |d| < 0.2
  - Small: 0.2 ≤ |d| < 0.5
  - Medium: 0.5 ≤ |d| < 0.8
  - Large: 0.8 ≤ |d| < 1.2
  - Very Large: |d| ≥ 1.2

### Limitations

1. **Simulated Environment:** Results reflect model assumptions, not real DAO behavior
2. **Fixed Parameters:** Only ${results.sweepParameter} was varied; other parameters held constant
3. **Distribution Assumptions:** Some metrics violate normality assumptions
4. **Model Validity:** See code review for known simulation issues

`;
}

function generateAppendix(results: ParsedResults): string {
  let section = `## Appendix: Full Statistics

### Raw Statistics by Metric and Sweep Value

`;

  for (const [metricName, stats] of results.stats) {
    const hasBootstrap = stats.some(s =>
      s.bootstrapCi95Lower !== undefined || s.bootstrapCi95Upper !== undefined
    );
    const hasIqr = stats.some(s => s.iqr !== undefined);

    section += `#### ${metricName}\n\n`;
    section += `| ${results.sweepParameter} | n | Mean | Median | Std | SE | 95% CI |`;
    if (hasBootstrap) {
      section += ` Bootstrap 95% CI |`;
    }
    if (hasIqr) {
      section += ` IQR |`;
    }
    section += ` Min | Max | CV |\n`;

    section += `|------|---|------|--------|-----|----|----|`;
    if (hasBootstrap) {
      section += `--------------|`;
    }
    if (hasIqr) {
      section += `------|`;
    }
    section += `-----|-----|----|\n`;

    for (const s of stats) {
      const ci = `[${s.ci95Lower.toFixed(4)}, ${s.ci95Upper.toFixed(4)}]`;
      const bootstrapCi = s.bootstrapCi95Lower !== undefined && s.bootstrapCi95Upper !== undefined
        ? `[${s.bootstrapCi95Lower.toFixed(4)}, ${s.bootstrapCi95Upper.toFixed(4)}]`
        : '-';
      const iqr = s.iqr !== undefined ? s.iqr.toFixed(4) : '-';
      const rowPrefix = `| ${s.sweepValue} | ${s.runCount} | ${s.mean.toFixed(6)} | ${s.median.toFixed(6)} | ${s.std.toFixed(6)} | ${s.se.toFixed(6)} | ${ci} |`;
      const rowTail = ` ${s.min.toFixed(4)} | ${s.max.toFixed(4)} | ${(s.cv * 100).toFixed(2)}% |`;
      let row = rowPrefix;
      if (hasBootstrap) {
        row += ` ${bootstrapCi} |`;
      }
      if (hasIqr) {
        row += ` ${iqr} |`;
      }
      row += rowTail;
      section += row + '\n';
    }

    section += '\n';
  }

  return section;
}

function generateReport(results: ParsedResults): string {
  const diagnostics = identifyDataQualityIssues(results);

  const timestamp = new Date().toISOString().split('T')[0];

  let report = `# DAO Simulation Research Quality Report

**Generated:** ${timestamp}
**Results Directory:** ${results.experimentName}

---

`;

  report += generateExecutiveSummary(results, diagnostics);
  report += generateKeyFindings(results);
  report += generateMethodology(results);
  report += generateCategoryAnalysis(results);
  report += generateDistributionAnalysis(results, diagnostics);
  report += generateTreasuryAnalysis(results);
  report += generateSignificanceAnalysis(results);
  report += generatePowerAnalysis(results);
  report += generateRecommendations(results, diagnostics);
  report += generateAppendix(results);

  report += `---

*Report generated by DAO Simulator Research Quality Report Generator*
`;

  return report;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('Starting research quality report generator...');
  const args = process.argv.slice(2);
  console.log('Arguments:', args);

  if (args.length === 0) {
    console.log(`
DAO Simulation Research Quality Report Generator

Usage:
  npx tsx scripts/generate-research-quality-report.ts <results-directory> [output-file]

Arguments:
  results-directory  Path to experiment results (containing stats.csv, significance.csv)
  output-file        Optional output path (default: <results-dir>/research-quality-report.md)

Example:
  npx tsx scripts/generate-research-quality-report.ts results/academic-100k-validation
  npx tsx scripts/generate-research-quality-report.ts results/my-experiment my-report.md
`);
    process.exit(1);
  }

  const resultsDir = args[0];
  const outputFile = args[1] || path.join(resultsDir, 'research-quality-report.md');

  if (!fs.existsSync(resultsDir)) {
    console.error(`Error: Results directory not found: ${resultsDir}`);
    process.exit(1);
  }

  console.log(`Parsing results from: ${resultsDir}`);
  const results = parseResults(resultsDir);

  console.log(`Found ${results.stats.size} metrics across ${results.sweepValues.length} sweep values`);
  console.log(`Total runs: ${results.totalRuns.toLocaleString()}`);

  console.log(`Generating report...`);
  const report = generateReport(results);

  console.log(`Writing report to: ${outputFile}`);
  fs.writeFileSync(outputFile, report, 'utf-8');

  console.log(`\n✅ Report generated successfully!`);
  console.log(`   ${outputFile}`);

  // Print summary
  const diagnostics = identifyDataQualityIssues(results);
  const critical = diagnostics.filter(d => d.severity === 'critical').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;
  const significant = results.anova.filter(a => a.significant).length;

  console.log(`\nSummary:`);
  console.log(`   - ${significant} of ${results.anova.length} metrics significantly affected by sweep parameter`);
  console.log(`   - ${critical} critical data quality issues`);
  console.log(`   - ${warnings} warnings`);
}

main();
