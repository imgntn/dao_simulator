import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { projectRoot, projectPath } from '@/lib/utils/server-paths';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizePath(baseDir: string, relativePath: string): string {
  const resolved = path.resolve(projectRoot(), relativePath);
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
    projectRoot(),
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
      cwd: projectRoot(),
      detached: true,
      stdio: ['ignore', logStream, logStream],
    });
  } else {
    const command = `npx tsx "${scriptPath}" ${args.map((arg) => `"${arg}"`).join(' ')}`;
    child = spawn(command, {
      cwd: projectRoot(),
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
  const authError = await requireAuth(request);
  if (authError) return authError;

  const contentType = request.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  let action = '';
  let configPath = '';
  let resultsDir = '';
  let inlineConfig: Record<string, unknown> | null = null;

  if (isJson) {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    action = String(body.action || '');
    configPath = String(body.configPath || '');
    resultsDir = String(body.resultsDir || '');
    if (body.inlineConfig && typeof body.inlineConfig === 'object') {
      inlineConfig = body.inlineConfig as Record<string, unknown>;
    }
  } else {
    const formData = await request.formData();
    action = String(formData.get('action') || '');
    configPath = String(formData.get('configPath') || '');
    resultsDir = String(formData.get('resultsDir') || '');
  }

  try {
    const normalizedProfile = 'full';

    function respond(params: Record<string, string>) {
      if (isJson) {
        return NextResponse.json({
          success: true,
          action: params.action,
          target: params.target,
          pid: params.pid ? Number(params.pid) : null,
          logFile: params.log || null,
        });
      }
      return buildRedirect(request, params);
    }

    switch (action) {
      case 'run': {
        const resolvedConfig = normalizePath(projectPath('experiments'), configPath);
        const logFile = path.join(projectPath('logs', 'research-ui'), `run-${Date.now()}.log`);
        const pid = spawnTsx('scripts/experiment-manager.ts', ['run', resolvedConfig], logFile);
        return respond({
          action,
          target: configPath,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
        });
      }
      case 'run-custom': {
        if (!inlineConfig) {
          return NextResponse.json({ error: 'inlineConfig required for run-custom' }, { status: 400 });
        }
        ensureDir(projectPath('experiments', 'custom'));
        const filename = `custom-${Date.now()}.yaml`;
        const customPath = path.join(projectPath('experiments', 'custom'), filename);
        fs.writeFileSync(customPath, yaml.stringify(inlineConfig), 'utf8');
        const logFile = path.join(projectPath('logs', 'research-ui'), `run-custom-${Date.now()}.log`);
        const pid = spawnTsx('scripts/experiment-manager.ts', ['run', customPath], logFile);
        return respond({
          action,
          target: `experiments/custom/${filename}`,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
        });
      }
      case 'resume': {
        const resolvedConfig = normalizePath(projectPath('experiments'), configPath);
        const logFile = path.join(projectPath('logs', 'research-ui'), `resume-${Date.now()}.log`);
        const pid = spawnTsx('scripts/experiment-manager.ts', ['resume', resolvedConfig], logFile);
        return respond({
          action,
          target: configPath,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
        });
      }
      case 'report': {
        const resolvedResults = normalizePath(projectPath('results'), resultsDir);
        const logFile = path.join(projectPath('logs', 'research-ui'), `report-${Date.now()}.log`);
        const pid = spawnTsx('scripts/generate-research-quality-report.ts', [resolvedResults], logFile);
        return respond({
          action,
          target: resultsDir,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
        });
      }
      case 'paper-update': {
        const logFile = path.join(projectPath('logs', 'research-ui'), `paper-update-${Date.now()}.log`);
        const updateArgs = ['--paper-dir', 'paper', '--profile', 'full'];
        const pid = spawnTsx('scripts/paper-update.ts', updateArgs, logFile);
        return respond({
          action,
          target: `profile:${normalizedProfile}`,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
        });
      }
      case 'paper-compile': {
        const logFile = path.join(projectPath('logs', 'research-ui'), `paper-compile-${Date.now()}.log`);
        const pid = spawnTsx('scripts/paper-compile.ts', ['--profile', normalizedProfile], logFile);
        return respond({
          action,
          target: `profile:${normalizedProfile}`,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
        });
      }
      case 'paper-archive': {
        const logFile = path.join(projectPath('logs', 'research-ui'), `paper-archive-${Date.now()}.log`);
        const pid = spawnTsx('scripts/paper-archive.ts', ['--profile', normalizedProfile], logFile);
        return respond({
          action,
          target: `profile:${normalizedProfile}`,
          pid: pid ? String(pid) : '',
          log: path.relative(projectRoot(), logFile).replace(/\\/g, '/'),
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
