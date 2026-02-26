#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const TARGET_DIR = path.join(ROOT, 'archive', `paper-consolidated-${TIMESTAMP}`);

type PaperTarget = {
  id: string;
  dir: string;
};

const PAPERS: PaperTarget[] = [
  { id: 'full', dir: path.join(ROOT, 'paper') },
  { id: 'p1', dir: path.join(ROOT, 'paper_p1') },
  { id: 'p2', dir: path.join(ROOT, 'paper_p2') },
  { id: 'llm', dir: path.join(ROOT, 'paper_llm') },
];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfExists(source: string, destination: string): boolean {
  if (!fs.existsSync(source)) return false;
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
  return true;
}

function writeIndex(copied: string[]): void {
  const lines: string[] = [];
  lines.push('# Consolidated Paper Bundle');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Included Files');
  lines.push('');
  for (const file of copied.sort((a, b) => a.localeCompare(b))) {
    lines.push(`- ${file}`);
  }
  lines.push('');
  fs.writeFileSync(path.join(TARGET_DIR, 'INDEX.md'), lines.join('\n'));
}

function main(): void {
  ensureDir(TARGET_DIR);
  const copied: string[] = [];

  for (const paper of PAPERS) {
    const pdfSrc = path.join(paper.dir, 'main.pdf');
    const texSrc = path.join(paper.dir, 'main.tex');
    const pdfDest = path.join(TARGET_DIR, 'pdf', `${paper.id}.pdf`);
    const texDest = path.join(TARGET_DIR, 'source', `${paper.id}.tex`);
    if (copyIfExists(pdfSrc, pdfDest)) copied.push(path.relative(TARGET_DIR, pdfDest).replace(/\\/g, '/'));
    if (copyIfExists(texSrc, texDest)) copied.push(path.relative(TARGET_DIR, texDest).replace(/\\/g, '/'));
  }

  const plainEnglishDir = path.join(ROOT, 'paper', 'plain-english');
  if (fs.existsSync(plainEnglishDir)) {
    const files = fs.readdirSync(plainEnglishDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const source = path.join(plainEnglishDir, file);
      const dest = path.join(TARGET_DIR, 'plain-english', file);
      if (copyIfExists(source, dest)) {
        copied.push(path.relative(TARGET_DIR, dest).replace(/\\/g, '/'));
      }
    }
  }

  const llmSummary = path.join(ROOT, 'results', 'experiments', '12-llm-reasoning-v4', 'summary.json');
  const llmReport = path.join(ROOT, 'results', 'experiments', '12-llm-reasoning-v4', 'research-quality-report.md');
  const llmStatus = path.join(ROOT, 'results', 'experiments', '12-llm-reasoning-v4', 'status.json');

  if (copyIfExists(llmSummary, path.join(TARGET_DIR, 'results', 'llm-summary.json'))) copied.push('results/llm-summary.json');
  if (copyIfExists(llmReport, path.join(TARGET_DIR, 'results', 'llm-research-quality-report.md'))) copied.push('results/llm-research-quality-report.md');
  if (copyIfExists(llmStatus, path.join(TARGET_DIR, 'results', 'llm-status.json'))) copied.push('results/llm-status.json');

  writeIndex(copied);
  console.log(`[consolidate] Created ${path.relative(ROOT, TARGET_DIR).replace(/\\/g, '/')}`);
}

main();

