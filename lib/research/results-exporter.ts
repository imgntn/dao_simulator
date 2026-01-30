/**
 * Results Exporter
 *
 * Exports experiment results to various formats (JSON, CSV).
 * Handles file writing and directory management.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  RunResult,
  ExperimentSummary,
  ReproducibilityManifest,
  OutputConfig,
} from './experiment-config';

// =============================================================================
// RESULTS EXPORTER CLASS
// =============================================================================

export class ResultsExporter {
  private outputDir: string;
  private config: OutputConfig;

  constructor(outputDir: string, config: OutputConfig) {
    this.outputDir = outputDir;
    this.config = config;
  }

  /**
   * Export all results from an experiment
   */
  async exportAll(
    results: RunResult[],
    summary: ExperimentSummary
  ): Promise<ExportResult> {
    // Ensure output directory exists
    this.ensureDirectory(this.outputDir);

    const exportedFiles: string[] = [];

    // Export based on configured formats
    for (const format of this.config.formats) {
      switch (format) {
        case 'json':
          exportedFiles.push(...(await this.exportJson(results, summary)));
          break;
        case 'csv':
          exportedFiles.push(...(await this.exportCsv(results, summary)));
          break;
        case 'parquet':
          // Parquet requires additional dependency - skip for now
          console.warn('Parquet export not yet implemented');
          break;
      }
    }

    // Export manifest if requested
    if (this.config.includeManifest) {
      const manifestPath = await this.exportManifest(summary.manifest);
      exportedFiles.push(manifestPath);
    }

    return {
      directory: this.outputDir,
      files: exportedFiles,
    };
  }

  /**
   * Export results to JSON format
   */
  private async exportJson(
    results: RunResult[],
    summary: ExperimentSummary
  ): Promise<string[]> {
    const files: string[] = [];

    // Export summary
    const summaryPath = path.join(this.outputDir, 'summary.json');
    await this.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    files.push(summaryPath);

    // Export individual runs if requested
    if (this.config.includeRawRuns) {
      const runsDir = path.join(this.outputDir, 'runs');
      this.ensureDirectory(runsDir);

      for (const result of results) {
        const runPath = path.join(runsDir, `${result.runId}.json`);
        await this.writeFile(runPath, JSON.stringify(result, null, 2));
        files.push(runPath);
      }
    }

    return files;
  }

  /**
   * Export results to CSV format
   */
  private async exportCsv(
    results: RunResult[],
    summary: ExperimentSummary
  ): Promise<string[]> {
    const files: string[] = [];

    // Export metrics summary CSV
    const metricsCsvPath = path.join(this.outputDir, 'metrics.csv');
    const metricsCsv = this.generateMetricsCsv(results);
    await this.writeFile(metricsCsvPath, metricsCsv);
    files.push(metricsCsvPath);

    // Export aggregated stats CSV
    const statsCsvPath = path.join(this.outputDir, 'stats.csv');
    const statsCsv = this.generateStatsCsv(summary);
    await this.writeFile(statsCsvPath, statsCsv);
    files.push(statsCsvPath);

    // Export timeline if included
    if (this.config.includeTimeline) {
      const timelineCsvPath = path.join(this.outputDir, 'timeline.csv');
      const timelineCsv = this.generateTimelineCsv(results);
      await this.writeFile(timelineCsvPath, timelineCsv);
      files.push(timelineCsvPath);
    }

    // Export statistical significance analysis if available
    if (summary.statisticalSignificance) {
      const sigCsvPath = path.join(this.outputDir, 'significance.csv');
      const sigCsv = this.generateSignificanceCsv(summary);
      await this.writeFile(sigCsvPath, sigCsv);
      files.push(sigCsvPath);

      // Export recommendations as text
      const recsPath = path.join(this.outputDir, 'recommendations.txt');
      const recs = summary.statisticalSignificance.recommendations.join('\n\n');
      await this.writeFile(recsPath, recs);
      files.push(recsPath);
    }

    return files;
  }

  /**
   * Generate CSV of statistical significance (pairwise comparisons)
   */
  private generateSignificanceCsv(summary: ExperimentSummary): string {
    const rows: string[] = [];

    // Pairwise comparisons header
    if (summary.statisticalSignificance?.pairwiseComparisons.length) {
      rows.push('# Pairwise T-Test Comparisons');
      rows.push('sweep_value_1,sweep_value_2,metric,t_statistic,df,p_value,significant,cohens_d,effect_interpretation');

      for (const comp of summary.statisticalSignificance.pairwiseComparisons) {
        rows.push([
          String(comp.sweepValue1),
          String(comp.sweepValue2),
          this.escapeCsv(comp.metricName),
          this.formatNumber(comp.tStatistic),
          this.formatNumber(comp.degreesOfFreedom),
          this.formatNumber(comp.pValue),
          comp.significant ? 'true' : 'false',
          this.formatNumber(comp.effectSize.cohensD),
          comp.effectSize.interpretation,
        ].join(','));
      }
    }

    // ANOVA results
    if (summary.statisticalSignificance?.anova?.length) {
      rows.push('');
      rows.push('# One-Way ANOVA Results');
      rows.push('metric,f_statistic,df_between,df_within,p_value,significant');

      for (const anova of summary.statisticalSignificance.anova) {
        rows.push([
          this.escapeCsv(anova.metricName),
          this.formatNumber(anova.fStatistic),
          String(anova.dfBetween),
          String(anova.dfWithin),
          this.formatNumber(anova.pValue),
          anova.significant ? 'true' : 'false',
        ].join(','));
      }
    }

    // Power analysis summary
    if (summary.statisticalSignificance?.overallPowerAnalysis) {
      const power = summary.statisticalSignificance.overallPowerAnalysis;
      rows.push('');
      rows.push('# Power Analysis');
      rows.push(`current_runs_per_config,${power.currentRunsPerConfig}`);
      rows.push(`recommended_runs,${power.recommendedRuns}`);
      rows.push(`current_power,${this.formatNumber(power.currentPower)}`);
      rows.push(`minimum_effect_detectable,${this.formatNumber(power.minimumEffectDetectable)}`);
    }

    return rows.join('\n');
  }

  /**
   * Generate CSV of raw metrics from all runs
   */
  private generateMetricsCsv(results: RunResult[]): string {
    if (results.length === 0) return '';

    // Get all metric names
    const metricNames = Object.keys(results[0].metrics);

    // Build header
    const headers = ['run_id', 'sweep_value', 'seed', 'duration_ms', ...metricNames];
    const rows: string[] = [headers.join(',')];

    // Build data rows
    for (const result of results) {
      const row = [
        this.escapeCsv(result.runId),
        result.sweepValue !== undefined ? String(result.sweepValue) : '',
        String(result.seed),
        String(result.durationMs),
        ...metricNames.map((name) => String(result.metrics[name] ?? '')),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generate CSV of aggregated statistics with confidence intervals
   */
  private generateStatsCsv(summary: ExperimentSummary): string {
    if (summary.metricsSummary.length === 0) return '';

    // Get all metric names from first summary
    const metricNames = summary.metricsSummary[0].metrics.map((m) => m.name);

    // Build header with extended stats columns for each metric
    const headers = ['sweep_value', 'run_count'];
    for (const name of metricNames) {
      headers.push(
        `${name}_mean`,
        `${name}_median`,
        `${name}_std`,
        `${name}_se`,           // Standard error
        `${name}_ci95_lower`,   // 95% CI lower
        `${name}_ci95_upper`,   // 95% CI upper
        `${name}_bootstrap_ci95_lower`, // Bootstrap 95% CI lower (if computed)
        `${name}_bootstrap_ci95_upper`, // Bootstrap 95% CI upper (if computed)
        `${name}_min`,
        `${name}_max`,
        `${name}_iqr`,          // Interquartile range
        `${name}_cv`            // Coefficient of variation
      );
    }
    const rows: string[] = [headers.join(',')];

    // Build data rows
    for (const sweepSummary of summary.metricsSummary) {
      const row: string[] = [
        sweepSummary.sweepValue !== undefined ? String(sweepSummary.sweepValue) : '',
        String(sweepSummary.runCount),
      ];

      for (const metric of sweepSummary.metrics) {
        row.push(
          this.formatNumber(metric.mean),
          this.formatNumber(metric.median),
          this.formatNumber(metric.std),
          this.formatNumber(metric.standardError || 0),
          this.formatNumber(metric.ci95?.lower || 0),
          this.formatNumber(metric.ci95?.upper || 0),
          this.formatNumber(metric.bootstrapCi95?.lower || 0),
          this.formatNumber(metric.bootstrapCi95?.upper || 0),
          this.formatNumber(metric.min),
          this.formatNumber(metric.max),
          this.formatNumber(metric.iqr || 0),
          this.formatNumber(metric.coefficientOfVariation || 0)
        );
      }

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generate CSV of timeline data
   */
  private generateTimelineCsv(results: RunResult[]): string {
    const rows: string[] = ['run_id,step,member_count,proposal_count,project_count,token_price,treasury_funds,gini,reputation_gini'];

    for (const result of results) {
      if (!result.timeline) continue;

      for (const entry of result.timeline) {
        rows.push(
          [
            this.escapeCsv(result.runId),
            entry.step,
            entry.memberCount,
            entry.proposalCount,
            entry.projectCount,
            this.formatNumber(entry.tokenPrice),
            this.formatNumber(entry.treasuryFunds),
            this.formatNumber(entry.gini),
            this.formatNumber(entry.reputationGini),
          ].join(',')
        );
      }
    }

    return rows.join('\n');
  }

  /**
   * Export reproducibility manifest
   */
  private async exportManifest(manifest: ReproducibilityManifest): Promise<string> {
    const manifestPath = path.join(this.outputDir, 'manifest.json');
    await this.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    return manifestPath;
  }

  /**
   * Ensure a directory exists
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Write content to a file
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  /**
   * Escape a value for CSV (handle commas and quotes)
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format a number for CSV output
   */
  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(6);
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface ExportResult {
  directory: string;
  files: string[];
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Export experiment results to files
 */
export async function exportResults(
  results: RunResult[],
  summary: ExperimentSummary,
  outputDir: string,
  config: OutputConfig
): Promise<ExportResult> {
  const exporter = new ResultsExporter(outputDir, config);
  return exporter.exportAll(results, summary);
}

/**
 * Export a single result to JSON
 */
export function resultToJson(result: RunResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Export summary to JSON
 */
export function summaryToJson(summary: ExperimentSummary): string {
  return JSON.stringify(summary, null, 2);
}
