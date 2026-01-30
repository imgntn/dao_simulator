#!/usr/bin/env node
/**
 * Living Document Paper Updater
 *
 * Updates the academic paper with latest experiment results.
 * Uses Ollama for text generation and ComfyUI/matplotlib for charts.
 *
 * Usage:
 *   npm run paper:update                    # Update all sections
 *   npm run paper:update -- --section results  # Update specific section
 *   npm run paper:update -- --charts-only     # Only regenerate charts
 *   npm run paper:update -- --compile         # Compile PDF after update
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  paperDir: path.join(process.cwd(), 'paper'),
  resultsDir: path.join(process.cwd(), 'results'),
  figuresDir: path.join(process.cwd(), 'paper', 'figures'),
  generatedDir: path.join(process.cwd(), 'paper', 'generated'),
  workflowsDir: path.join(process.cwd(), 'paper', 'workflows'),

  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'deepseek-r1:32b', // ultrathink
    fallbackModel: 'deepseek-r1:8b',
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

const PAPER_PROFILE_CONFIGS: Record<string, string[]> = {
  full: [
    'experiments/paper/00-academic-baseline.yaml',
    'experiments/paper/01-calibration-participation.yaml',
    'experiments/paper/02-ablation-governance.yaml',
    'experiments/paper/03-sensitivity-quorum.yaml',
    'experiments/paper/04-governance-capture-mitigations.yaml',
    'experiments/paper/05-proposal-pipeline.yaml',
    'experiments/paper/06-treasury-resilience.yaml',
    'experiments/paper/07-inter-dao-cooperation.yaml',
  ],
  p1: [
    'experiments/paper/00-academic-baseline.yaml',
    'experiments/paper/01-calibration-participation.yaml',
    'experiments/paper/02-ablation-governance.yaml',
    'experiments/paper/03-sensitivity-quorum.yaml',
    'experiments/paper/04-governance-capture-mitigations.yaml',
  ],
  p2: [
    'experiments/paper/00-academic-baseline.yaml',
    'experiments/paper/02-ablation-governance.yaml',
    'experiments/paper/05-proposal-pipeline.yaml',
    'experiments/paper/06-treasury-resilience.yaml',
    'experiments/paper/07-inter-dao-cooperation.yaml',
  ],
};

function resolveOutputDir(configPath: string): string {
  const absolutePath = path.resolve(configPath);
  if (!fs.existsSync(absolutePath)) return '';
  const content = fs.readFileSync(absolutePath, 'utf8');
  const parsed = yaml.parse(content);
  const outputDir = parsed?.output?.directory;
  if (outputDir) return path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
  if (parsed?.name) {
    return path.join(process.cwd(), 'results', String(parsed.name).replace(/[^\w\-]+/g, '_').toLowerCase());
  }
  return '';
}

function resolveProfileOutputDirs(profile: string): Set<string> {
  const configs = PAPER_PROFILE_CONFIGS[profile] || PAPER_PROFILE_CONFIGS.full;
  const dirs = configs
    .map(resolveOutputDir)
    .filter((dir) => dir);
  return new Set(dirs.map((dir) => path.resolve(dir)));
}

async function loadAllResults(allowedDirs?: Set<string>): Promise<ExperimentResults[]> {
  const results: ExperimentResults[] = [];

  if (!fs.existsSync(CONFIG.resultsDir)) {
    console.log('No results directory found');
    return results;
  }

  const rootDirs = fs.readdirSync(CONFIG.resultsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const candidateDirs: string[] = [];
  for (const dir of rootDirs) {
    if (dir === 'paper') {
      const paperRoot = path.join(CONFIG.resultsDir, dir);
      if (!fs.existsSync(paperRoot)) continue;
      const paperDirs = fs.readdirSync(paperRoot, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(paperRoot, d.name));
      candidateDirs.push(...paperDirs);
    } else {
      candidateDirs.push(path.join(CONFIG.resultsDir, dir));
    }
  }

  for (const dirPath of candidateDirs) {
    if (allowedDirs && !allowedDirs.has(path.resolve(dirPath))) {
      continue;
    }
    const summaryPath = path.join(dirPath, 'summary.json');
    const metricsPath = path.join(dirPath, 'metrics.csv');
    const statsPath = path.join(dirPath, 'stats.csv');

    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const metrics = fs.existsSync(metricsPath)
        ? parseCSV(fs.readFileSync(metricsPath, 'utf8'))
        : [];
      const stats = fs.existsSync(statsPath)
        ? parseCSV(fs.readFileSync(statsPath, 'utf8'))
        : [];

      const name = path.basename(dirPath);

      results.push({
        name,
        directory: dirPath,
        summary,
        metrics,
        stats,
      });
    }
  }

  return results;
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((h, i) => {
      const val = values[i];
      obj[h] = isNaN(Number(val)) ? val : Number(val);
    });
    return obj;
  });
}

// =============================================================================
// OLLAMA INTEGRATION
// =============================================================================

type TaskType = 'default' | 'findings' | 'discussion' | 'methodology';

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

  try {
    const response = await fetch(`${CONFIG.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.ollama.model,
        messages,
        stream: false,
        options: {
          temperature: params.temperature,
          top_p: params.top_p,
          top_k: params.top_k,
          repeat_penalty: params.repeat_penalty || 1.1,
        },
      }),
    });

    if (!response.ok) {
      // Try fallback model
      const fallbackResponse = await fetch(`${CONFIG.ollama.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CONFIG.ollama.fallbackModel,
          messages,
          stream: false,
        }),
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Ollama error: ${fallbackResponse.status}`);
      }
      const data = await fallbackResponse.json();
      return data.message?.content || '';
    }

    const data = await response.json();
    return data.message?.content || '';
  } catch (error) {
    console.error('Ollama query failed:', error);
    return '[OLLAMA_UNAVAILABLE]';
  }
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

  return queryOllama(prompt, systemPrompt, 'findings');
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

  return queryOllama(prompt, systemPrompt, taskType);
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
    const { execSync } = require('child_process');
    execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Chart generation failed: ${error}`);
    return false;
  }
}

async function generatePlaceholderChart(
  label: string,
  outputPath: string
): Promise<boolean> {
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
print('Placeholder chart saved to ${outputPath.replace(/\\/g, '/')}')
`;

  fs.writeFileSync(scriptPath, pythonScript);

  try {
    const { execSync } = require('child_process');
    execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Placeholder chart generation failed: ${error}`);
    return false;
  }
}

async function ensurePlaceholderFigures(): Promise<void> {
  const placeholders = [
    { file: 'rq1_turnout.png', label: 'RQ1: Turnout vs participation_target_rate' },
    { file: 'rq1_retention.png', label: 'RQ1: Voter retention vs participation_target_rate' },
    { file: 'rq2_whale_influence.png', label: 'RQ2: Whale influence vs mitigation settings' },
    { file: 'rq2_tradeoff.png', label: 'RQ2: Capture risk vs throughput tradeoff' },
    { file: 'rq3_time.png', label: 'RQ3: Time-to-decision vs temp-check fraction' },
    { file: 'rq3_passrate.png', label: 'RQ3: Pass rate vs fast-track settings' },
    { file: 'rq4_volatility.png', label: 'RQ4: Treasury volatility vs stabilization' },
    { file: 'rq4_growth.png', label: 'RQ4: Treasury trend/growth vs buffer fraction' },
    { file: 'rq5_success.png', label: 'RQ5: Inter-DAO success rate by scenario' },
    { file: 'rq5_resources.png', label: 'RQ5: Resource flow volume by scenario' },
    { file: 'ablation_impact.png', label: 'Ablation: Mechanism removal impacts' },
    { file: 'quorum_sensitivity.png', label: 'Sensitivity: Quorum curve' },
  ];

  for (const placeholder of placeholders) {
    const outputPath = path.join(CONFIG.figuresDir, placeholder.file);
    if (fs.existsSync(outputPath)) {
      continue;
    }
    await generatePlaceholderChart(placeholder.label, outputPath);
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
plt.bar(x, values, yerr=errors, capsize=5, color=['#2ecc71', '#3498db', '#e74c3c'][:len(categories)])
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

async function updateSection(
  sectionPath: string,
  results: ExperimentResults[],
  metadata: PaperMetadata
): Promise<void> {
  if (!fs.existsSync(sectionPath)) {
    console.log(`Section not found: ${sectionPath}`);
    return;
  }

  let content = fs.readFileSync(sectionPath, 'utf8');

  // Basic variable replacement
  content = replaceTemplateVars(content, {
    TIMESTAMP: metadata.timestamp,
    EXPERIMENT_COUNT: metadata.experimentCount,
    TOTAL_RUNS: metadata.totalRuns,
    // Add more as needed
  });

  // Save updated content
  fs.writeFileSync(sectionPath, content);
  console.log(`Updated: ${path.basename(sectionPath)}`);
}

// =============================================================================
// CHART GENERATION TASKS
// =============================================================================

async function generateAllCharts(results: ExperimentResults[]): Promise<void> {
  console.log('\n=== Generating Charts ===\n');

  // Ensure figures directory exists
  if (!fs.existsSync(CONFIG.figuresDir)) {
    fs.mkdirSync(CONFIG.figuresDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.generatedDir)) {
    fs.mkdirSync(CONFIG.generatedDir, { recursive: true });
  }

  // Find quorum sweep results
  const quorumResults = results.find(r => r.name.includes('quorum'));
  if (quorumResults && quorumResults.stats.length > 0) {
    console.log('Generating quorum sensitivity chart...');
    await generateChartWithPython(
      'line_with_error',
      quorumResults.stats.map(s => ({
        sweep_value: s.sweep_value,
        mean: s['Proposal Pass Rate_mean'] ?? s['proposal_pass_rate_mean'] ?? 0,
        std: s['Proposal Pass Rate_std'] ?? s['proposal_pass_rate_std'] ?? 0,
      })),
      path.join(CONFIG.figuresDir, 'quorum_passrate.png'),
      {
        xlabel: 'Quorum Threshold (%)',
        ylabel: 'Proposal Pass Rate',
        title: 'Effect of Quorum on Proposal Outcomes',
      }
    );
  }

  // Find scale study results
  const scaleResults = results.find(r => r.name.includes('scale'));
  if (scaleResults && scaleResults.stats.length > 0) {
    console.log('Generating scale effects chart...');
    await generateChartWithPython(
      'line_with_error',
      scaleResults.stats.map(s => ({
        sweep_value: s.sweep_value,
        mean: s['Average Turnout_mean'] ?? s['average_turnout_mean'] ?? 0,
        std: s['Average Turnout_std'] ?? s['average_turnout_std'] ?? 0,
      })),
      path.join(CONFIG.figuresDir, 'scale_participation.png'),
      {
        xlabel: 'DAO Size (Members)',
        ylabel: 'Average Turnout',
        title: 'Participation Rate vs. DAO Size',
      }
    );
  }

  // Find voting comparison results
  const votingResults = results.find(r => r.name.includes('voting'));
  if (votingResults && votingResults.stats.length > 0) {
    console.log('Generating voting comparison chart...');
    await generateChartWithPython(
      'bar_comparison',
      votingResults.stats.map(s => ({
        category: s.sweep_value,
        value: s['Proposal Pass Rate_mean'] ?? s['proposal_pass_rate_mean'] ?? 0,
        std: s['Proposal Pass Rate_std'] ?? s['proposal_pass_rate_std'] ?? 0,
      })),
      path.join(CONFIG.figuresDir, 'voting_comparison.png'),
      {
        xlabel: 'Voting Mechanism',
        ylabel: 'Proposal Pass Rate',
        title: 'Comparison of Voting Mechanisms',
      }
    );
  }

  console.log('Ensuring placeholder figures for new RQs...');
  await ensurePlaceholderFigures();

  console.log('Chart generation complete.\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const chartsOnly = args.includes('--charts-only');
  const compile = args.includes('--compile');
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

  if (paperDirArg) {
    applyPaperDirOverride(paperDirArg);
  }

  console.log('=== Living Document Paper Updater ===\n');

  // Load results
  console.log('Loading experiment results...');
  const allowedDirs = profileArg ? resolveProfileOutputDirs(profileArg) : undefined;
  const results = await loadAllResults(allowedDirs);
  console.log(`Found ${results.length} experiment result sets\n`);

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
    if (paperDirArg && paperDirArg.includes('paper_p1')) {
      return 'docs/RQ_PAPER_CHECKLIST_P1.md';
    }
    if (paperDirArg && paperDirArg.includes('paper_p2')) {
      return 'docs/RQ_PAPER_CHECKLIST_P2.md';
    }
    return '';
  })();
  buildRqChecklistSection(metadata, rqChecklistArg || defaultChecklist || undefined);

  // Generate charts
  await generateAllCharts(results);

  if (chartsOnly) {
    console.log('Charts-only mode, skipping text updates.');
    return;
  }

  // Update sections
  console.log('=== Updating Paper Sections ===\n');

  const sectionsDir = path.join(CONFIG.paperDir, 'sections');
  const sections = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.tex'));

  for (const section of sections) {
    if (targetSection && !section.includes(targetSection)) continue;

    const sectionPath = path.join(sectionsDir, section);
    await updateSection(sectionPath, results, metadata);
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
      const { execSync } = require('child_process');
      process.chdir(CONFIG.paperDir);
      execSync('pdflatex -interaction=nonstopmode main.tex', { stdio: 'inherit' });
      execSync('bibtex main', { stdio: 'inherit' });
      execSync('pdflatex -interaction=nonstopmode main.tex', { stdio: 'inherit' });
      execSync('pdflatex -interaction=nonstopmode main.tex', { stdio: 'inherit' });
      console.log(`\nPDF compiled: ${path.join(CONFIG.paperDir, 'main.pdf')}`);
    } catch (error) {
      console.error('PDF compilation failed. Ensure LaTeX is installed.');
    }
  }

  console.log('\n=== Update Complete ===');
  console.log(`Experiments: ${metadata.experimentCount}`);
  console.log(`Total Runs: ${metadata.totalRuns}`);
  console.log(`Timestamp: ${metadata.timestamp}`);
}

main().catch(console.error);
