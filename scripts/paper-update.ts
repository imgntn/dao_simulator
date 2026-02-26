#!/usr/bin/env node
/**
 * Living Document Paper Updater
 *
 * Updates the academic paper with latest experiment results.
 * Supports both local LLM (Ollama) and Claude API for text generation.
 *
 * Usage:
 *   npm run paper:update                       # Update all sections with LLM (Ollama default)
 *   npm run paper:update -- --provider=claude  # Use Claude API instead of Ollama
 *   npm run paper:update -- --no-llm           # Skip LLM generation, only template vars
 *   npm run paper:update -- --section results  # Update specific section
 *   npm run paper:update -- --charts-only      # Only regenerate charts
 *   npm run paper:update -- --compile          # Compile PDF after update
 *
 * LLM-updated sections: results, discussion, conclusion, abstract
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY - Required for Claude provider
 *   LLM_PROVIDER - Default provider (ollama|claude), defaults to ollama
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  type PaperProfile,
  assertFreshResults,
  parseCSV as parseCsvRows,
  resolveOutputDir,
  resolveProfileConfigPaths,
  toNumber,
} from './paper-pipeline-utils';

// =============================================================================
// CONFIGURATION
// =============================================================================

// =============================================================================
// LLM PROVIDER TYPES
// =============================================================================

type LLMProvider = 'ollama' | 'claude';

const CONFIG = {
  paperDir: path.join(process.cwd(), 'paper'),
  resultsDir: path.join(process.cwd(), 'results'),
  figuresDir: path.join(process.cwd(), 'paper', 'figures'),
  generatedDir: path.join(process.cwd(), 'paper', 'generated'),
  workflowsDir: path.join(process.cwd(), 'paper', 'workflows'),

  // LLM provider configuration - defaults to ollama (local)
  llm: {
    provider: (process.env.LLM_PROVIDER || 'ollama') as LLMProvider,
  },

  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:32b-instruct',
    fallbackModel: 'deepseek-r1:32b',
    // Optimized parameters from ultrathink analysis
    parameters: {
      default: {
        temperature: 0.4,
        top_p: 0.9,
        top_k: 50,
        repeat_penalty: 1.1,
      },
      findings: {
        temperature: 0.3,  // Lower for precise statistical claims
        top_p: 0.85,
        top_k: 40,
        repeat_penalty: 1.15, // Higher to avoid repetitive phrasing
      },
      discussion: {
        temperature: 0.5,  // Higher for interpretation
        top_p: 0.92,
        top_k: 60,
        repeat_penalty: 1.05, // Lower to allow some repetition for emphasis
      },
      methodology: {
        temperature: 0.25, // Very precise technical language
        top_p: 0.8,
        top_k: 30,
        repeat_penalty: 1.2, // Highest - methodology should not repeat
      },
    },
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
    // Claude-specific parameters mapped to task types
    parameters: {
      default: {
        temperature: 0.4,
        max_tokens: 4096,
      },
      findings: {
        temperature: 0.3,  // Lower for precise statistical claims
        max_tokens: 2048,
      },
      discussion: {
        temperature: 0.5,  // Higher for interpretation
        max_tokens: 4096,
      },
      methodology: {
        temperature: 0.25, // Very precise technical language
        max_tokens: 4096,
      },
    },
  },

  comfyui: {
    baseUrl: 'http://localhost:8188',
  },
};

function applyPaperDirOverride(paperDir: string): void {
  const resolved = path.isAbsolute(paperDir)
    ? paperDir
    : path.join(process.cwd(), paperDir);
  CONFIG.paperDir = resolved;
  CONFIG.figuresDir = path.join(resolved, 'figures');
  CONFIG.generatedDir = path.join(resolved, 'generated');
  CONFIG.workflowsDir = path.join(resolved, 'workflows');
}

// =============================================================================
// TYPES
// =============================================================================

interface ExperimentResults {
  name: string;
  configPath: string;
  directory: string;
  summary: any;
  metrics: any[];
  stats: any[];
}

interface PaperMetadata {
  timestamp: string;
  experimentCount: number;
  totalRuns: number;
  experiments: string[];
}

// =============================================================================
// RESULTS LOADING
// =============================================================================

async function loadResultsForConfigs(configPaths: string[]): Promise<ExperimentResults[]> {
  const results: ExperimentResults[] = [];
  for (const configPath of configPaths) {
    const dirPath = resolveOutputDir(process.cwd(), configPath);
    if (!dirPath) {
      continue;
    }

    const summaryPath = path.join(dirPath, 'summary.json');
    const metricsPath = path.join(dirPath, 'metrics.csv');
    const statsPath = path.join(dirPath, 'stats.csv');

    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const metrics = fs.existsSync(metricsPath)
        ? parseCsvRows(fs.readFileSync(metricsPath, 'utf8'))
        : [];
      const stats = fs.existsSync(statsPath)
        ? parseCsvRows(fs.readFileSync(statsPath, 'utf8'))
        : [];

      const name = path.basename(dirPath);

      results.push({
        name,
        configPath,
        directory: dirPath,
        summary,
        metrics,
        stats,
      });
    }
  }

  return results;
}

// =============================================================================
// LLM INTEGRATION (Ollama + Claude)
// =============================================================================

type TaskType = 'default' | 'findings' | 'discussion' | 'methodology';

/**
 * Query the configured LLM provider (Ollama or Claude)
 * Routes to the appropriate backend based on CONFIG.llm.provider
 */
async function queryLLM(
  prompt: string,
  systemPrompt?: string,
  taskType: TaskType = 'default'
): Promise<string> {
  const provider = CONFIG.llm.provider;

  if (provider === 'claude') {
    return queryClaude(prompt, systemPrompt, taskType);
  }

  // Default to Ollama (local)
  return queryOllama(prompt, systemPrompt, taskType);
}

/**
 * Query Claude API
 */
async function queryClaude(
  prompt: string,
  systemPrompt?: string,
  taskType: TaskType = 'default'
): Promise<string> {
  if (!CONFIG.claude.apiKey) {
    console.error('ANTHROPIC_API_KEY not set. Falling back to Ollama.');
    return queryOllama(prompt, systemPrompt, taskType);
  }

  const params = CONFIG.claude.parameters[taskType] || CONFIG.claude.parameters.default;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.claude.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CONFIG.claude.model,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        system: systemPrompt || undefined,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API error (${response.status}): ${errorText}`);
      console.log('Falling back to Ollama...');
      return queryOllama(prompt, systemPrompt, taskType);
    }

    const data = await response.json();
    // Claude returns content as an array of content blocks
    const textContent = data.content?.find((c: any) => c.type === 'text');
    return textContent?.text || '';
  } catch (error) {
    console.error('Claude query failed:', error);
    console.log('Falling back to Ollama...');
    return queryOllama(prompt, systemPrompt, taskType);
  }
}

/**
 * Query local Ollama instance using streaming mode
 * (streaming avoids headers timeout since headers are sent immediately)
 */
async function queryOllama(
  prompt: string,
  systemPrompt?: string,
  taskType: TaskType = 'default'
): Promise<string> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Get task-specific parameters
  const params = CONFIG.ollama.parameters[taskType] || CONFIG.ollama.parameters.default;

  // Use AbortController with 10 minute timeout for large models
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    const response = await fetch(`${CONFIG.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.ollama.model,
        messages,
        stream: true, // Use streaming to avoid headers timeout
        options: {
          temperature: params.temperature,
          top_p: params.top_p,
          top_k: params.top_k,
          repeat_penalty: params.repeat_penalty || 1.1,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try fallback model
      console.log(`Primary model failed, trying fallback: ${CONFIG.ollama.fallbackModel}`);
      return queryOllamaWithModel(CONFIG.ollama.fallbackModel, messages, params);
    }

    // Collect streaming response
    return await collectStreamResponse(response);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Ollama query failed:', error);
    return '[LLM_UNAVAILABLE]';
  }
}

/**
 * Helper to query Ollama with a specific model
 */
async function queryOllamaWithModel(
  model: string,
  messages: any[],
  params: any
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    const response = await fetch(`${CONFIG.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: params,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    return await collectStreamResponse(response);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Collect streaming response from Ollama into a single string
 */
async function collectStreamResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let content = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Each line is a JSON object with the streaming response
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          content += json.message.content;
        }
      } catch {
        // Ignore parse errors for partial chunks
      }
    }
  }

  return content;
}

async function generateFinding(data: any, context: string): Promise<string> {
  // Optimized system prompt from ultrathink analysis
  const systemPrompt = `You are a quantitative research analyst for an academic paper on DAO governance simulation.
Generate statistically-grounded findings. Each finding must:
1. Cite specific numbers with appropriate precision (mean ± SD)
2. Note statistical significance or uncertainty where applicable
3. Be exactly one sentence of 20-35 words
4. Use academic passive voice
Output ONLY the finding sentence, no preamble or explanation.`;

  const prompt = `Experimental data:
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

Study context: ${context}

Write ONE finding sentence (20-35 words) that states the key relationship and includes the primary statistic.`;

  return queryLLM(prompt, systemPrompt, 'findings');
}

async function generateSectionText(
  sectionName: string,
  data: any,
  existingText: string
): Promise<string> {
  // Determine task type based on section name
  let taskType: TaskType = 'default';
  if (sectionName.includes('result')) taskType = 'findings';
  else if (sectionName.includes('discussion')) taskType = 'discussion';
  else if (sectionName.includes('method')) taskType = 'methodology';

  const systemPrompt = `You are updating an academic paper section with new experimental results.
Instructions:
1. Preserve the existing structure and style
2. Update ALL numerical values to match new data
3. Revise findings sentences to reflect new patterns
4. Keep LaTeX formatting intact (commands, environments, labels)
5. Do not add new subsections or major structural changes
Output ONLY the updated LaTeX content.`;

  const prompt = `Section: ${sectionName}

Current LaTeX content:
\`\`\`latex
${existingText}
\`\`\`

New experimental data:
${JSON.stringify(data, null, 2)}

Return the updated LaTeX section text with all numbers updated.`;

  return queryLLM(prompt, systemPrompt, taskType);
}

// =============================================================================
// CHART GENERATION
// =============================================================================

async function generateChartWithPython(
  chartType: string,
  data: any[],
  outputPath: string,
  options: any = {}
): Promise<boolean> {
  // Generate Python script for matplotlib
  const pythonScript = generateMatplotlibScript(chartType, data, outputPath, options);
  const scriptPath = path.join(CONFIG.generatedDir, `chart_${Date.now()}.py`);

  fs.writeFileSync(scriptPath, pythonScript);

  try {
    execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Chart generation failed: ${error}`);
    return false;
  } finally {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
  }
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findResult(results: ExperimentResults[], nameFragment: string): ExperimentResults | null {
  const key = normalizeKey(nameFragment);
  return results.find((result) => normalizeKey(result.name).includes(key)) || null;
}

function findMetricBase(statsRows: Record<string, string>[], candidates: string[]): string {
  if (statsRows.length === 0) return '';

  const headers = Object.keys(statsRows[0]).filter((header) => header.endsWith('_mean'));
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const exact = headers.find((header) => normalizeKey(header.slice(0, -5)) === target);
    if (exact) {
      return exact.slice(0, -5);
    }
  }

  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const partial = headers.find((header) => normalizeKey(header.slice(0, -5)).includes(target));
    if (partial) {
      return partial.slice(0, -5);
    }
  }

  return '';
}

function buildSeries(
  statsRows: Record<string, string>[],
  metricCandidates: string[]
): Array<{ sweep: string; mean: number; std: number }> {
  const metricBase = findMetricBase(statsRows, metricCandidates);
  if (!metricBase) return [];

  return statsRows.map((row) => ({
    sweep: String(row.sweep_value ?? ''),
    mean: toNumber(row[`${metricBase}_mean`]),
    std: toNumber(row[`${metricBase}_std`]),
  }));
}

function toLineData(series: Array<{ sweep: string; mean: number; std: number }>): any[] {
  return series.map((point) => ({
    sweep_value: point.sweep,
    mean: point.mean,
    std: point.std,
  }));
}

function toBarData(series: Array<{ sweep: string; mean: number; std: number }>): any[] {
  return series.map((point) => ({
    category: point.sweep,
    value: point.mean,
    std: point.std,
  }));
}

function extractVotingMechanismLabel(sweepValue: string): string {
  const lowered = sweepValue.toLowerCase();
  if (lowered.includes('quadratic')) return 'Quadratic';
  if (lowered.includes('conviction')) return 'Conviction';
  if (lowered.includes('majority')) return 'Majority';
  return sweepValue;
}

async function generatePlaceholderChart(label: string, outputPath: string): Promise<boolean> {
  const scriptPath = path.join(CONFIG.generatedDir, `placeholder_${Date.now()}.py`);
  const safeLabel = label.replace(/'/g, "\\'");
  const pythonScript = `
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

plt.figure(figsize=(8, 5))
plt.text(0.5, 0.5, '${safeLabel}', ha='center', va='center', fontsize=14)
plt.axis('off')
plt.tight_layout()
plt.savefig('${outputPath.replace(/\\/g, '/')}', dpi=300, bbox_inches='tight')
plt.close()
`;

  fs.writeFileSync(scriptPath, pythonScript);
  try {
    execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  } finally {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
  }
}

function generateMatplotlibScript(
  chartType: string,
  data: any[],
  outputPath: string,
  options: any
): string {
  const dataJson = JSON.stringify(data);

  return `
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import numpy as np
import json

# Style for academic papers
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.size'] = 11
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['figure.figsize'] = (8, 5)

data = json.loads('${dataJson.replace(/'/g, "\\'")}')

${getChartCode(chartType, options)}

plt.tight_layout()
plt.savefig('${outputPath.replace(/\\/g, '/')}', dpi=300, bbox_inches='tight')
plt.close()
print(f'Chart saved to ${outputPath.replace(/\\/g, '/')}')
`;
}

function getChartCode(chartType: string, options: any): string {
  switch (chartType) {
    case 'line_with_error':
      return `
x = [d['${options.x || 'sweep_value'}'] for d in data]
y = [d['${options.y || 'mean'}'] for d in data]
yerr = [d.get('${options.yerr || 'std'}', 0) for d in data]

plt.errorbar(x, y, yerr=yerr, capsize=5, marker='o', markersize=6, linewidth=2)
plt.xlabel('${options.xlabel || 'Parameter Value'}')
plt.ylabel('${options.ylabel || 'Metric'}')
plt.title('${options.title || ''}')
`;

    case 'bar_comparison':
      return `
categories = [d['${options.category || 'category'}'] for d in data]
values = [d['${options.value || 'value'}'] for d in data]
errors = [d.get('${options.error || 'std'}', 0) for d in data]

x = np.arange(len(categories))
palette = ['#1f77b4', '#2ca02c', '#ff7f0e', '#d62728', '#9467bd', '#8c564b', '#17becf']
colors = [palette[i % len(palette)] for i in range(len(categories))]
plt.bar(x, values, yerr=errors, capsize=5, color=colors)
plt.xticks(x, categories)
plt.xlabel('${options.xlabel || 'Category'}')
plt.ylabel('${options.ylabel || 'Value'}')
plt.title('${options.title || ''}')
`;

    case 'scatter':
      return `
x = [d['${options.x || 'x'}'] for d in data]
y = [d['${options.y || 'y'}'] for d in data]

plt.scatter(x, y, alpha=0.6, s=50)
plt.xlabel('${options.xlabel || 'X'}')
plt.ylabel('${options.ylabel || 'Y'}')
plt.title('${options.title || ''}')

# Add regression line
if len(set(x)) > 1:
    z = np.polyfit(x, y, 1)
    p = np.poly1d(z)
    plt.plot(x, p(x), 'r--', alpha=0.8, label=f'y = {z[0]:.3f}x + {z[1]:.3f}')
    plt.legend()
`;

    default:
      return `
print("Unknown chart type: ${chartType}")
`;
  }
}

// =============================================================================
// COMFYUI INTEGRATION (for stylized charts)
// =============================================================================

async function checkComfyUI(): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.comfyui.baseUrl}/system_stats`);
    return response.ok;
  } catch {
    return false;
  }
}

async function runComfyUIWorkflow(workflowPath: string, inputs: any): Promise<string | null> {
  // Load workflow JSON
  if (!fs.existsSync(workflowPath)) {
    console.error(`Workflow not found: ${workflowPath}`);
    return null;
  }

  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

  // Apply inputs to workflow
  // This would need to be customized based on workflow structure
  // For now, we'll save the workflow for manual use

  console.log(`ComfyUI workflow prepared: ${workflowPath}`);
  console.log('Run manually in ComfyUI or use API queue');

  return null;
}

// =============================================================================
// TEMPLATE REPLACEMENT
// =============================================================================

function replaceTemplateVars(content: string, vars: Record<string, string | number>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/&/g, '\\&')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}');
}

function formatInlineCode(text: string): string {
  const parts = text.split(/`([^`]+)`/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return `\\texttt{${escapeLatex(part)}}`;
    }
    return escapeLatex(part);
  }).join('');
}

function buildRqChecklistSection(metadata: PaperMetadata, sourcePath?: string): void {
  const resolvedSource = sourcePath
    ? (path.isAbsolute(sourcePath) ? sourcePath : path.join(process.cwd(), sourcePath))
    : path.join(process.cwd(), 'docs', 'RQ_PAPER_CHECKLIST.md');
  const targetPath = path.join(CONFIG.paperDir, 'sections', 'appendix_rq_checklist.tex');

  if (!fs.existsSync(resolvedSource)) {
    console.warn('RQ checklist source not found:', resolvedSource);
    return;
  }

  const lines = fs.readFileSync(resolvedSource, 'utf8').split(/\r?\n/);
  const output: string[] = [];

  output.push('% AUTO-GENERATED RQ CHECKLIST');
  output.push(`% Source: ${path.relative(process.cwd(), resolvedSource)}`);
  output.push(`% Last generated: ${metadata.timestamp}`);
  output.push('');
  output.push('\\subsection*{Legend}');
  output.push('\\begin{itemize}');
  output.push('  \\item[$\\Box$] todo');
  output.push('  \\item[$\\boxtimes$] done');
  output.push('\\end{itemize}');
  output.push('');

  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        output.push('\\end{itemize}');
        output.push('');
        inList = false;
      }
      continue;
    }

    if (line.startsWith('# ')) {
      // Skip document title
      continue;
    }

    if (line.toLowerCase().startsWith('legend:')) {
      // We provide our own legend
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) {
        output.push('\\end{itemize}');
        output.push('');
        inList = false;
      }
      const heading = formatInlineCode(line.slice(3).trim());
      output.push(`\\subsection{${heading}}`);
      output.push('');
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        output.push('\\begin{itemize}');
        inList = true;
      }

      let content = line.slice(2).trim();
      let checkbox: string | null = null;
      if (content.startsWith('[ ] ')) {
        checkbox = '\\Box';
        content = content.slice(4);
      } else if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        checkbox = '\\boxtimes';
        content = content.slice(4);
      }

      const formatted = formatInlineCode(content);
      if (checkbox) {
        output.push(`  \\item[$${checkbox}$] ${formatted}`);
      } else {
        output.push(`  \\item ${formatted}`);
      }
      continue;
    }

    if (inList) {
      output.push('\\end{itemize}');
      output.push('');
      inList = false;
    }
    output.push(formatInlineCode(line));
  }

  if (inList) {
    output.push('\\end{itemize}');
  }

  fs.writeFileSync(targetPath, output.join('\n'));
  console.log(`Generated: ${path.basename(targetPath)}`);
}

// Sections that should be updated with LLM-generated content
const LLM_SECTIONS = ['results', 'discussion', 'conclusion', 'abstract'];

// Map sections to relevant experiment data
function getRelevantData(sectionName: string, results: ExperimentResults[]): any {
  const name = sectionName.toLowerCase();

  // Aggregate key metrics from all experiments
  const aggregatedData: any = {
    experiments: results.map(r => r.name),
    totalRuns: results.reduce((sum, r) => sum + (r.summary?.totalRuns || 0), 0),
    summaries: {},
    keyMetrics: {},
  };

  for (const result of results) {
    aggregatedData.summaries[result.name] = result.summary;

    // Extract key metrics from stats
    if (result.stats.length > 0) {
      aggregatedData.keyMetrics[result.name] = result.stats.slice(0, 5); // First 5 stat rows
    }
  }

  // Section-specific data filtering
  if (name.includes('result')) {
    // Results section gets all experimental data
    return aggregatedData;
  } else if (name.includes('discussion')) {
    // Discussion gets summaries and key findings
    return {
      experiments: aggregatedData.experiments,
      summaries: aggregatedData.summaries,
      totalRuns: aggregatedData.totalRuns,
    };
  } else if (name.includes('conclusion') || name.includes('abstract')) {
    // High-level summary only
    return {
      experimentCount: results.length,
      totalRuns: aggregatedData.totalRuns,
      experimentNames: aggregatedData.experiments,
    };
  }

  return aggregatedData;
}

async function updateSection(
  sectionPath: string,
  results: ExperimentResults[],
  metadata: PaperMetadata,
  useLLM: boolean = false
): Promise<void> {
  if (!fs.existsSync(sectionPath)) {
    console.log(`Section not found: ${sectionPath}`);
    return;
  }

  const sectionName = path.basename(sectionPath, '.tex');
  let content = fs.readFileSync(sectionPath, 'utf8');

  // Basic variable replacement (always done)
  content = replaceTemplateVars(content, {
    TIMESTAMP: metadata.timestamp,
    EXPERIMENT_COUNT: metadata.experimentCount,
    TOTAL_RUNS: metadata.totalRuns,
  });

  // LLM-based content generation for specific sections
  const shouldUseLLM = useLLM && LLM_SECTIONS.some(s => sectionName.includes(s));

  if (shouldUseLLM) {
    console.log(`  Generating LLM content for ${sectionName}...`);
    const relevantData = getRelevantData(sectionName, results);

    try {
      const updatedContent = await generateSectionText(sectionName, relevantData, content);

      // Validate the response looks like LaTeX
      if (updatedContent &&
          updatedContent.length > 100 &&
          !updatedContent.includes('[LLM_UNAVAILABLE]') &&
          (updatedContent.includes('\\') || updatedContent.includes('section'))) {
        content = updatedContent;
        console.log(`  LLM updated: ${sectionName} (${content.length} chars)`);
      } else {
        console.log(`  LLM response invalid, keeping original: ${sectionName}`);
      }
    } catch (error) {
      console.error(`  LLM generation failed for ${sectionName}:`, error);
    }
  }

  // Save updated content
  fs.writeFileSync(sectionPath, content);
  console.log(`Updated: ${path.basename(sectionPath)}`);
}

// =============================================================================
// CHART GENERATION TASKS
// =============================================================================

async function renderLineFigure(
  result: ExperimentResults | null,
  outputFile: string,
  metricCandidates: string[],
  options: { xlabel: string; ylabel: string; title: string }
): Promise<boolean> {
  if (!result || result.stats.length === 0) return false;
  const series = buildSeries(result.stats, metricCandidates);
  if (series.length === 0) return false;

  return generateChartWithPython(
    'line_with_error',
    toLineData(series),
    path.join(CONFIG.figuresDir, outputFile),
    options
  );
}

async function renderScatterFigure(
  result: ExperimentResults | null,
  outputFile: string,
  xCandidates: string[],
  yCandidates: string[],
  options: { xlabel: string; ylabel: string; title: string }
): Promise<boolean> {
  if (!result || result.stats.length === 0) return false;

  const xMetricBase = findMetricBase(result.stats, xCandidates);
  const yMetricBase = findMetricBase(result.stats, yCandidates);
  if (!xMetricBase || !yMetricBase) return false;

  const data = result.stats.map((row) => ({
    x: toNumber(row[`${xMetricBase}_mean`], Number.NaN),
    y: toNumber(row[`${yMetricBase}_mean`], Number.NaN),
  })).filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y));

  if (data.length < 2) return false;

  return generateChartWithPython(
    'scatter',
    data,
    path.join(CONFIG.figuresDir, outputFile),
    options
  );
}

async function renderVotingComparisonFigure(
  result: ExperimentResults | null,
  outputFile: string
): Promise<boolean> {
  if (!result || result.stats.length === 0) return false;
  const passRateBase = findMetricBase(result.stats, ['Proposal Pass Rate']);
  if (!passRateBase) return false;

  const byMechanism = new Map<string, { valueSum: number; stdSum: number; count: number }>();
  for (const row of result.stats) {
    const mechanism = extractVotingMechanismLabel(String(row.sweep_value || 'unknown'));
    const value = toNumber(row[`${passRateBase}_mean`], Number.NaN);
    const std = toNumber(row[`${passRateBase}_std`], 0);
    if (!Number.isFinite(value)) continue;

    const current = byMechanism.get(mechanism) || { valueSum: 0, stdSum: 0, count: 0 };
    current.valueSum += value;
    current.stdSum += std;
    current.count += 1;
    byMechanism.set(mechanism, current);
  }

  if (byMechanism.size === 0) return false;

  const data = Array.from(byMechanism.entries()).map(([category, agg]) => ({
    category,
    value: agg.valueSum / agg.count,
    std: agg.stdSum / agg.count,
  }));

  return generateChartWithPython(
    'bar_comparison',
    data,
    path.join(CONFIG.figuresDir, outputFile),
    {
      xlabel: 'Voting Mechanism',
      ylabel: 'Proposal Pass Rate',
      title: 'Comparison of Voting Mechanisms',
    }
  );
}

async function generateAllCharts(
  results: ExperimentResults[],
  profile: PaperProfile,
  allowPlaceholders: boolean
): Promise<void> {
  console.log('\n=== Generating Charts ===\n');

  // Ensure figures directory exists
  if (!fs.existsSync(CONFIG.figuresDir)) {
    fs.mkdirSync(CONFIG.figuresDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.generatedDir)) {
    fs.mkdirSync(CONFIG.generatedDir, { recursive: true });
  }

  type ChartTask = {
    file: string;
    label: string;
    run: () => Promise<boolean>;
  };

  const tasks: ChartTask[] = [];

  if (profile === 'full') {
    tasks.push({
      file: 'quorum_passrate.png',
      label: 'Quorum pass rate',
      run: () => renderLineFigure(
        findResult(results, '03-sensitivity-quorum'),
        'quorum_passrate.png',
        ['Proposal Pass Rate'],
        {
          xlabel: 'Quorum Threshold',
          ylabel: 'Proposal Pass Rate',
          title: 'Effect of Quorum on Proposal Outcomes',
        }
      ),
    });
    tasks.push({
      file: 'scale_participation.png',
      label: 'Scale participation',
      run: () => renderLineFigure(
        findResult(results, '08-scale-sweep'),
        'scale_participation.png',
        ['Voter Participation Rate', 'Average Turnout'],
        {
          xlabel: 'DAO Size',
          ylabel: 'Participation Rate',
          title: 'Participation vs DAO Size',
        }
      ),
    });
    tasks.push({
      file: 'voting_comparison.png',
      label: 'Voting comparison',
      run: () => renderVotingComparisonFigure(
        findResult(results, '09-voting-mechanisms'),
        'voting_comparison.png'
      ),
    });
  } else if (profile === 'p1') {
    tasks.push({
      file: 'rq1_turnout.png',
      label: 'RQ1 turnout',
      run: () => renderLineFigure(
        findResult(results, '01-calibration-participation'),
        'rq1_turnout.png',
        ['Average Turnout'],
        {
          xlabel: 'Calibration Sweep',
          ylabel: 'Average Turnout',
          title: 'Turnout vs Participation Calibration',
        }
      ),
    });
    tasks.push({
      file: 'rq1_retention.png',
      label: 'RQ1 retention',
      run: () => renderLineFigure(
        findResult(results, '01-calibration-participation'),
        'rq1_retention.png',
        ['Voter Retention Rate'],
        {
          xlabel: 'Calibration Sweep',
          ylabel: 'Voter Retention Rate',
          title: 'Retention vs Participation Calibration',
        }
      ),
    });
    tasks.push({
      file: 'rq2_whale_influence.png',
      label: 'RQ2 whale influence',
      run: () => renderLineFigure(
        findResult(results, '04-governance-capture-mitigations'),
        'rq2_whale_influence.png',
        ['Whale Influence'],
        {
          xlabel: 'Mitigation Configuration',
          ylabel: 'Whale Influence',
          title: 'Whale Influence Across Mitigations',
        }
      ),
    });
    tasks.push({
      file: 'rq2_tradeoff.png',
      label: 'RQ2 tradeoff',
      run: () => renderScatterFigure(
        findResult(results, '04-governance-capture-mitigations'),
        'rq2_tradeoff.png',
        ['Governance Capture Risk'],
        ['Proposal Pass Rate'],
        {
          xlabel: 'Governance Capture Risk',
          ylabel: 'Proposal Pass Rate',
          title: 'Capture Risk vs Throughput',
        }
      ),
    });
    tasks.push({
      file: 'rq3_time.png',
      label: 'RQ3 time to decision',
      run: () => renderLineFigure(
        findResult(results, '05-proposal-pipeline'),
        'rq3_time.png',
        ['Avg Time to Decision'],
        {
          xlabel: 'Pipeline Configuration',
          ylabel: 'Average Time to Decision',
          title: 'Decision Time by Pipeline Configuration',
        }
      ),
    });
    tasks.push({
      file: 'rq3_passrate.png',
      label: 'RQ3 pass rate',
      run: () => renderLineFigure(
        findResult(results, '05-proposal-pipeline'),
        'rq3_passrate.png',
        ['Proposal Pass Rate'],
        {
          xlabel: 'Pipeline Configuration',
          ylabel: 'Proposal Pass Rate',
          title: 'Proposal Pass Rate by Pipeline Configuration',
        }
      ),
    });
  } else if (profile === 'p2') {
    tasks.push({
      file: 'rq4_volatility.png',
      label: 'RQ4 volatility',
      run: () => renderLineFigure(
        findResult(results, '06-treasury-resilience'),
        'rq4_volatility.png',
        ['Treasury Volatility'],
        {
          xlabel: 'Treasury Configuration',
          ylabel: 'Treasury Volatility',
          title: 'Treasury Volatility by Policy',
        }
      ),
    });
    tasks.push({
      file: 'rq4_growth.png',
      label: 'RQ4 growth',
      run: () => renderLineFigure(
        findResult(results, '06-treasury-resilience'),
        'rq4_growth.png',
        ['Treasury Growth Rate', 'Treasury Trend'],
        {
          xlabel: 'Treasury Configuration',
          ylabel: 'Treasury Growth Rate',
          title: 'Treasury Growth by Policy',
        }
      ),
    });
    tasks.push({
      file: 'rq5_success.png',
      label: 'RQ5 success',
      run: () => renderLineFigure(
        findResult(results, '07-inter-dao-cooperation'),
        'rq5_success.png',
        ['ecosystem.Inter-DAO Proposal Success Rate'],
        {
          xlabel: 'Cooperation Scenario',
          ylabel: 'Inter-DAO Success Rate',
          title: 'Inter-DAO Success by Scenario',
        }
      ),
    });
    tasks.push({
      file: 'rq5_resources.png',
      label: 'RQ5 resources',
      run: () => renderLineFigure(
        findResult(results, '07-inter-dao-cooperation'),
        'rq5_resources.png',
        ['ecosystem.Resource Flow Volume', 'ecosystem.Total Shared Budget'],
        {
          xlabel: 'Cooperation Scenario',
          ylabel: 'Resource Flow Volume',
          title: 'Resource Flow by Scenario',
        }
      ),
    });
  } else {
    const llmResult = findResult(results, '12-llm-reasoning') || findResult(results, 'llm-agent-reasoning');
    tasks.push({
      file: 'llm_vote_consistency.png',
      label: 'LLM vote consistency',
      run: () => renderLineFigure(
        llmResult,
        'llm_vote_consistency.png',
        ['LLM Vote Consistency'],
        {
          xlabel: 'LLM Mode',
          ylabel: 'Vote Consistency',
          title: 'LLM Vote Consistency by Reasoning Mode',
        }
      ),
    });
    tasks.push({
      file: 'llm_cache_hit_rate.png',
      label: 'LLM cache hit rate',
      run: () => renderLineFigure(
        llmResult,
        'llm_cache_hit_rate.png',
        ['LLM Cache Hit Rate'],
        {
          xlabel: 'LLM Mode',
          ylabel: 'Cache Hit Rate',
          title: 'Cache Hit Rate by Reasoning Mode',
        }
      ),
    });
    tasks.push({
      file: 'llm_avg_latency.png',
      label: 'LLM average latency',
      run: () => renderLineFigure(
        llmResult,
        'llm_avg_latency.png',
        ['LLM Avg Latency', 'LLM Avg Latency ms'],
        {
          xlabel: 'LLM Mode',
          ylabel: 'Average Latency (ms)',
          title: 'LLM Inference Latency by Reasoning Mode',
        }
      ),
    });
    tasks.push({
      file: 'llm_outcomes_tradeoff.png',
      label: 'LLM outcomes tradeoff',
      run: () => renderScatterFigure(
        llmResult,
        'llm_outcomes_tradeoff.png',
        ['LLM Avg Latency', 'LLM Avg Latency ms'],
        ['Proposal Pass Rate'],
        {
          xlabel: 'Average LLM Latency (ms)',
          ylabel: 'Proposal Pass Rate',
          title: 'Governance Throughput vs LLM Latency',
        }
      ),
    });
  }

  for (const task of tasks) {
    const success = await task.run();
    if (success) {
      console.log(`Generated: ${task.file}`);
      continue;
    }

    const outputPath = path.join(CONFIG.figuresDir, task.file);
    if (allowPlaceholders) {
      console.warn(`Data missing for ${task.file}; writing placeholder`);
      const placeholderSuccess = await generatePlaceholderChart(task.label, outputPath);
      if (placeholderSuccess) {
        continue;
      }
    }

    throw new Error(`Unable to generate required figure: ${task.file}`);
  }

  console.log('Chart generation complete.\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const chartsOnly = args.includes('--charts-only');
  const compile = args.includes('--compile');
  const allowPlaceholders = args.includes('--allow-placeholders');
  const strictFreshness = !(args.includes('--allow-stale') || args.includes('--skip-freshness-check'));
  const noLLM = args.includes('--no-llm');
  const enableLLM = args.includes('--llm') || args.includes('--use-llm');
  const useLLM = enableLLM && !noLLM;
  const sectionArg = args.find(a => a.startsWith('--section='));
  const targetSection = sectionArg?.split('=')[1];
  const paperDirArg = (() => {
    const inline = args.find(a => a.startsWith('--paper-dir='));
    if (inline) return inline.split('=')[1];
    const idx = args.findIndex(a => a === '--paper-dir');
    if (idx !== -1) return args[idx + 1];
    return '';
  })();
  const rqChecklistArg = (() => {
    const inline = args.find(a => a.startsWith('--rq-checklist='));
    if (inline) return inline.split('=')[1];
    const idx = args.findIndex(a => a === '--rq-checklist');
    if (idx !== -1) return args[idx + 1];
    return '';
  })();
  const profileArg = (() => {
    const inline = args.find(a => a.startsWith('--profile='));
    if (inline) return inline.split('=')[1];
    const idx = args.findIndex(a => a === '--profile' || a === '--paper');
    if (idx !== -1) return args[idx + 1];
    return '';
  })();
  const profile = (() => {
    const parsed = profileArg as PaperProfile;
    if (parsed === 'p1' || parsed === 'p2' || parsed === 'llm' || parsed === 'full') {
      return parsed;
    }
    const targetDir = (paperDirArg || CONFIG.paperDir).toLowerCase();
    if (targetDir.includes('paper_p1')) return 'p1' as PaperProfile;
    if (targetDir.includes('paper_p2')) return 'p2' as PaperProfile;
    if (targetDir.includes('paper_llm')) return 'llm' as PaperProfile;
    return 'full' as PaperProfile;
  })();

  // Parse LLM provider argument
  const providerArg = (() => {
    const inline = args.find(a => a.startsWith('--provider='));
    if (inline) return inline.split('=')[1] as LLMProvider;
    const idx = args.findIndex(a => a === '--provider');
    if (idx !== -1) return args[idx + 1] as LLMProvider;
    return null;
  })();

  // Override provider if specified via CLI
  if (providerArg && (providerArg === 'ollama' || providerArg === 'claude')) {
    CONFIG.llm.provider = providerArg;
  }

  if (paperDirArg) {
    applyPaperDirOverride(paperDirArg);
  }

  console.log('=== Living Document Paper Updater ===\n');
  console.log(`Profile: ${profile}`);
  console.log(`Strict freshness check: ${strictFreshness ? 'enabled' : 'disabled'}`);
  console.log(`Placeholder figures: ${allowPlaceholders ? 'enabled' : 'disabled'}\n`);

  // Show LLM provider info
  if (useLLM) {
    const provider = CONFIG.llm.provider;
    if (provider === 'claude') {
      const hasKey = !!CONFIG.claude.apiKey;
      console.log(`LLM Provider: Claude (${CONFIG.claude.model})`);
      if (!hasKey) {
        console.warn('Warning: ANTHROPIC_API_KEY not set, will fall back to Ollama if needed\n');
      }
    } else {
      console.log(`LLM Provider: Ollama (${CONFIG.ollama.model})`);
      console.log(`  Fallback: ${CONFIG.ollama.fallbackModel}`);
    }
  } else {
    console.log('LLM content generation disabled by default. Pass --llm to enable.\n');
  }
  console.log('');

  // Load results
  const configPaths = resolveProfileConfigPaths(process.cwd(), profile, false);
  console.log(`Using ${configPaths.length} experiment configs for profile ${profile}`);

  const freshnessResults = assertFreshResults(process.cwd(), configPaths, strictFreshness);
  const warningCount = freshnessResults.reduce(
    (sum, item) => sum + item.issues.filter((issue) => issue.severity === 'warning').length,
    0
  );
  if (warningCount > 0) {
    console.warn(`Freshness warnings detected: ${warningCount}`);
  }

  console.log('\nLoading experiment results...');
  const results = await loadResultsForConfigs(configPaths);
  console.log(`Found ${results.length} experiment result sets\n`);
  if (results.length === 0 && !allowPlaceholders) {
    throw new Error(`No results found for profile ${profile}. Run paper suite first, or pass --allow-placeholders with --allow-stale for scaffold generation.`);
  }
  if (results.length === 0 && allowPlaceholders) {
    console.warn('No result sets found; generating placeholder-backed paper assets.');
  }

  // Calculate metadata
  const metadata: PaperMetadata = {
    timestamp: new Date().toISOString(),
    experimentCount: results.length,
    totalRuns: results.reduce((sum, r) => sum + (r.summary?.totalRuns || 0), 0),
    experiments: results.map(r => r.name),
  };

  console.log(`Total runs across all experiments: ${metadata.totalRuns}\n`);

  // Generate RQ checklist appendix section from docs
  const defaultChecklist = (() => {
    if (profile === 'p1') {
      return 'docs/RQ_PAPER_CHECKLIST_P1.md';
    }
    if (profile === 'p2') {
      return 'docs/RQ_PAPER_CHECKLIST_P2.md';
    }
    if (profile === 'llm') {
      return 'docs/RQ_PAPER_CHECKLIST_LLM.md';
    }
    return '';
  })();
  buildRqChecklistSection(metadata, rqChecklistArg || defaultChecklist || undefined);

  // Generate charts
  await generateAllCharts(results, profile, allowPlaceholders);

  if (chartsOnly) {
    console.log('Charts-only mode, skipping text updates.');
    return;
  }

  // Update sections
  console.log('=== Updating Paper Sections ===\n');
  if (useLLM) {
    console.log(`LLM content generation ENABLED for: ${LLM_SECTIONS.join(', ')}\n`);
  } else {
    console.log('LLM content generation DISABLED (--no-llm flag)\n');
  }

  const sectionsDir = path.join(CONFIG.paperDir, 'sections');
  const sections = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.tex'));

  for (const section of sections) {
    if (targetSection && !section.includes(targetSection)) continue;

    const sectionPath = path.join(sectionsDir, section);
    await updateSection(sectionPath, results, metadata, useLLM);
  }

  // Update main.tex metadata
  const mainPath = path.join(CONFIG.paperDir, 'main.tex');
  if (fs.existsSync(mainPath)) {
    let mainContent = fs.readFileSync(mainPath, 'utf8');
    mainContent = mainContent.replace(
      /\\newcommand\{\\experimentcount\}\{[^}]*\}/,
      `\\newcommand{\\experimentcount}{${metadata.experimentCount}}`
    );
    mainContent = mainContent.replace(
      /\\newcommand\{\\totalruns\}\{[^}]*\}/,
      `\\newcommand{\\totalruns}{${metadata.totalRuns}}`
    );
    fs.writeFileSync(mainPath, mainContent);
    console.log('Updated main.tex metadata\n');
  }

  // Compile if requested
  if (compile) {
    console.log('=== Compiling PDF ===\n');
    try {
      execSync(
        `npx tsx scripts/paper-compile.ts --paper-dir "${CONFIG.paperDir}" --no-archive`,
        {
          cwd: process.cwd(),
          stdio: 'inherit',
        }
      );
    } catch (error) {
      console.error('PDF compilation failed.');
    }
  }

  console.log('\n=== Update Complete ===');
  console.log(`Experiments: ${metadata.experimentCount}`);
  console.log(`Total Runs: ${metadata.totalRuns}`);
  console.log(`Timestamp: ${metadata.timestamp}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
