#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();

const GENERATED_DIRS = [
  path.join(ROOT, 'paper', 'generated'),
  path.join(ROOT, 'paper_p1', 'generated'),
  path.join(ROOT, 'paper_p2', 'generated'),
  path.join(ROOT, 'paper_llm', 'generated'),
];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanupGeneratedDir(dir: string): number {
  ensureDir(dir);
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;
    const fullPath = path.join(dir, entry.name);
    fs.rmSync(fullPath, { recursive: true, force: true });
    removed += 1;
  }
  const keepPath = path.join(dir, '.gitkeep');
  if (!fs.existsSync(keepPath)) {
    fs.writeFileSync(keepPath, '');
  }
  return removed;
}

function main(): void {
  let removedTotal = 0;
  for (const dir of GENERATED_DIRS) {
    const removed = cleanupGeneratedDir(dir);
    removedTotal += removed;
    console.log(`[cleanup] ${path.relative(ROOT, dir).replace(/\\/g, '/')} removed ${removed} entries`);
  }

  const pycache = path.join(ROOT, 'paper', 'press-releases', '__pycache__');
  if (fs.existsSync(pycache)) {
    fs.rmSync(pycache, { recursive: true, force: true });
    console.log('[cleanup] removed paper/press-releases/__pycache__');
  }

  console.log(`[cleanup] done, removed ${removedTotal} generated entries`);
}

main();

