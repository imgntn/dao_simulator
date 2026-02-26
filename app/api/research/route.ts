import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const ROOT_DIR = process.cwd();
const EXPERIMENTS_DIR = path.join(ROOT_DIR, 'experiments');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');
const LOG_DIR = path.join(ROOT_DIR, 'logs', 'research-ui');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizePath(baseDir: string, relativePath: string): string {
  const resolved = path.resolve(ROOT_DIR, relativePath);
  const base = path.resolve(baseDir);
  if (!resolved.startsWith(base)) {
    throw new Error(`Path is outside allowed directory: ${relativePath}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${relativePath}`);
  }
  return resolved;
}

function getTsxBinary(): string | null {
  const bin = path.join(
    ROOT_DIR,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  );
  return fs.existsSync(bin) ? bin : null;
}

function spawnTsx(scriptPath: string, args: string[], logFile: string): number | null {
  ensureDir(path.dirname(logFile));
  fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] starting ${scriptPath} ${args.join(' ')}\n`);

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const tsxBin = getTsxBinary();
  let child;

  if (tsxBin) {
    child = spawn(tsxBin, [scriptPath, ...args], {
      cwd: ROOT_DIR,
      detached: true,
      stdio: ['ignore', logStream, logStream],
    });
  } else {
    const command = `npx tsx "${scriptPath}" ${args.map((arg) => `"${arg}"`).join(' ')}`;
    child = spawn(command, {
      cwd: ROOT_DIR,
      detached: true,
      stdio: ['ignore', logStream, logStream],
      shell: true,
    });
  }

  child.unref();
  return child.pid ?? null;
}

function buildRedirect(request: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/console', request.url);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  let action = '';
  let configPath = '';
  let resultsDir = '';
  let paperProfile = '';

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({} as Record<string, string>));
    action = body.action || '';
    configPath = body.configPath || '';
    resultsDir = body.resultsDir || '';
    paperProfile = body.paperProfile || '';
  } else {
    const formData = await request.formData();
    action = String(formData.get('action') || '');
    configPath = String(formData.get('configPath') || '');
    resultsDir = String(formData.get('resultsDir') || '');
    paperProfile = String(formData.get('paperProfile') || '');
  }

  try {
    const normalizedProfile = (() => {
      if (paperProfile === 'p1' || paperProfile === 'p2' || paperProfile === 'llm' || paperProfile === 'full' || paperProfile === 'both' || paperProfile === 'all') {
        return paperProfile;
      }
      return 'full';
    })();

    switch (action) {
      case 'run': {
        const resolvedConfig = normalizePath(EXPERIMENTS_DIR, configPath);
        const logFile = path.join(LOG_DIR, `run-${Date.now()}.log`);
        const pid = spawnTsx('scripts/experiment-manager.ts', ['run', resolvedConfig], logFile);
        return buildRedirect(request, {
          action,
          target: configPath,
          pid: pid ? String(pid) : '',
          log: path.relative(ROOT_DIR, logFile).replace(/\\/g, '/'),
        });
      }
      case 'resume': {
        const resolvedConfig = normalizePath(EXPERIMENTS_DIR, configPath);
        const logFile = path.join(LOG_DIR, `resume-${Date.now()}.log`);
        const pid = spawnTsx('scripts/experiment-manager.ts', ['resume', resolvedConfig], logFile);
        return buildRedirect(request, {
          action,
          target: configPath,
          pid: pid ? String(pid) : '',
          log: path.relative(ROOT_DIR, logFile).replace(/\\/g, '/'),
        });
      }
      case 'report': {
        const resolvedResults = normalizePath(RESULTS_DIR, resultsDir);
        const logFile = path.join(LOG_DIR, `report-${Date.now()}.log`);
        const pid = spawnTsx('scripts/generate-research-quality-report.ts', [resolvedResults], logFile);
        return buildRedirect(request, {
          action,
          target: resultsDir,
          pid: pid ? String(pid) : '',
          log: path.relative(ROOT_DIR, logFile).replace(/\\/g, '/'),
        });
      }
      case 'paper-update': {
        const logFile = path.join(LOG_DIR, `paper-update-${Date.now()}.log`);
        const argsByProfile: Record<string, string[]> = {
          p1: ['--paper-dir', 'paper_p1', '--profile', 'p1'],
          p2: ['--paper-dir', 'paper_p2', '--profile', 'p2'],
          llm: ['--paper-dir', 'paper_llm', '--profile', 'llm'],
          full: ['--paper-dir', 'paper', '--profile', 'full'],
        };
        const updateArgs = argsByProfile[normalizedProfile] || argsByProfile.full;
        const pid = spawnTsx('scripts/paper-update.ts', updateArgs, logFile);
        return buildRedirect(request, {
          action,
          target: `profile:${normalizedProfile}`,
          pid: pid ? String(pid) : '',
          log: path.relative(ROOT_DIR, logFile).replace(/\\/g, '/'),
        });
      }
      case 'paper-compile': {
        const logFile = path.join(LOG_DIR, `paper-compile-${Date.now()}.log`);
        const pid = spawnTsx('scripts/paper-compile.ts', ['--profile', normalizedProfile], logFile);
        return buildRedirect(request, {
          action,
          target: `profile:${normalizedProfile}`,
          pid: pid ? String(pid) : '',
          log: path.relative(ROOT_DIR, logFile).replace(/\\/g, '/'),
        });
      }
      case 'paper-archive': {
        const logFile = path.join(LOG_DIR, `paper-archive-${Date.now()}.log`);
        const pid = spawnTsx('scripts/paper-archive.ts', ['--profile', normalizedProfile], logFile);
        return buildRedirect(request, {
          action,
          target: `profile:${normalizedProfile}`,
          pid: pid ? String(pid) : '',
          log: path.relative(ROOT_DIR, logFile).replace(/\\/g, '/'),
        });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
