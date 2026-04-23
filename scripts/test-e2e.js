#!/usr/bin/env node
/**
 * E2E Test Runner
 * Starts dev server and websocket server, waits for them to be ready,
 * runs Playwright tests, then cleans up.
 *
 * Usage:
 *   node scripts/test-e2e.js [playwright-args...]
 *
 * Examples:
 *   node scripts/test-e2e.js --project=smoke
 *   node scripts/test-e2e.js --project=dashboard --headed
 *   node scripts/test-e2e.js --ui
 */

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const { buildBaseUrl, DEFAULT_PORT, getPortFromUrl } = require('./port-utils');

const MAX_WAIT_MS = 180000; // 3 minutes max wait for servers
const HEALTHCHECK_TIMEOUT_MS = 20000;
const HEALTH_PATHS = ['/api/healthz', '/api/healthz/simulate'];
const REPO_PATH = process.cwd();
const SERVER_INFO_FILE = path.join(os.tmpdir(), `dao-simulator-e2e-${process.pid}.json`);

const processes = [];

function log(msg) {
  console.log(`[test-e2e] ${msg}`);
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // Drain the response so sockets do not linger in CLOSE_WAIT.
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(HEALTHCHECK_TIMEOUT_MS, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function checkServerHealth(baseUrl) {
  const base = new URL(baseUrl);
  for (const path of HEALTH_PATHS) {
    const url = new URL(path, base).toString();
    if (!(await checkUrl(url))) {
      return false;
    }
  }
  return true;
}

function clearStaleWindowsNodeListener(baseUrl) {
  if (process.platform !== 'win32') return false;

  const port = getPortFromUrl(baseUrl);

  try {
    const netstatOutput = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    const lines = netstatOutput
      .split(/\r?\n/)
      .filter((line) => line.includes(`:${port}`) && line.includes('LISTENING'));

    const pids = [...new Set(lines
      .map((line) => line.trim().split(/\s+/).pop())
      .filter((pid) => pid && pid !== '0'))];

    let cleared = false;
    for (const pid of pids) {
      const tasklistOutput = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
      if (!tasklistOutput.toLowerCase().includes('node.exe')) {
        continue;
      }

      log(`Stopping stale node listener on port ${port} (pid: ${pid})`);
      execFileSync('taskkill', ['/PID', pid, '/F', '/T'], { stdio: 'ignore' });
      cleared = true;
    }

    return cleared;
  } catch {
    return false;
  }
}

function clearStaleWindowsRepoNodeProcesses() {
  if (process.platform !== 'win32') return false;

  try {
    const escapedRepoPath = REPO_PATH.replace(/\\/g, '\\\\');
    const powershellScript = [
      `$repo = '${escapedRepoPath}'`,
      "Get-CimInstance Win32_Process |",
      "Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like ('*' + $repo + '*') } |",
      'ForEach-Object {',
      "  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output $_.ProcessId } catch {}",
      '}',
    ].join(' ');

    const output = execFileSync('powershell', ['-NoProfile', '-Command', powershellScript], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output) {
      return false;
    }

    const killed = output.split(/\r?\n/).filter(Boolean);
    if (killed.length > 0) {
      log(`Stopped stale repo-local node processes: ${killed.join(', ')}`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function getProcessExitMessage(proc, name) {
  if (!proc?.exited) {
    return '';
  }

  const status = proc.exitSignal
    ? `signal ${proc.exitSignal}`
    : `code ${proc.exitCodeValue ?? 'unknown'}`;
  return `${name} process exited before readiness (${status})${proc.lastOutput ? `: ${proc.lastOutput}` : ''}`;
}

async function waitForServer(url, name, proc) {
  const start = Date.now();
  log(`Waiting for ${name} at ${url}...`);

  while (Date.now() - start < MAX_WAIT_MS) {
    const exitMessage = getProcessExitMessage(proc, name);
    if (exitMessage) {
      throw new Error(exitMessage);
    }

    if (await checkServerHealth(url)) {
      const postHealthExitMessage = getProcessExitMessage(proc, name);
      if (postHealthExitMessage) {
        throw new Error(postHealthExitMessage);
      }

      log(`${name} is ready`);
      return true;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error(`${name} failed to start within ${MAX_WAIT_MS / 1000}s`);
}

function startProcess(command, args, name, extraEnv = {}) {
  const isWindows = process.platform === 'win32';
  const executable = isWindows && command === 'npm'
    ? 'npm.cmd'
    : isWindows && command === 'npx'
      ? 'npx.cmd'
      : command;
  const useShell = isWindows && (command === 'npm' || command === 'npx');
  const proc = spawn(executable, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: useShell,
    detached: !isWindows,
    windowsHide: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  proc.exited = false;
  proc.exitCodeValue = null;
  proc.exitSignal = null;
  proc.lastOutput = '';

  proc.stdout.on('data', (data) => {
    proc.lastOutput = data.toString().trim() || proc.lastOutput;
    if (process.env.VERBOSE) {
      console.log(`[${name}] ${data.toString().trim()}`);
    }
  });

  proc.stderr.on('data', (data) => {
    proc.lastOutput = data.toString().trim() || proc.lastOutput;
    if (process.env.VERBOSE) {
      console.error(`[${name}] ${data.toString().trim()}`);
    }
  });

  proc.on('exit', (code, signal) => {
    proc.exited = true;
    proc.exitCodeValue = code;
    proc.exitSignal = signal;
    if (code && code !== 0) {
      log(`${name} exited with code ${code}${proc.lastOutput ? `: ${proc.lastOutput}` : ''}`);
    }
  });

  processes.push(proc);
  log(`Started ${name} (pid: ${proc.pid})`);
  return proc;
}

async function waitForServerInfo(proc) {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const exitMessage = getProcessExitMessage(proc, 'Next.js dev server');
    if (exitMessage) {
      throw new Error(exitMessage);
    }

    try {
      const serverInfo = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf8'));
      if (serverInfo?.baseUrl) {
        return serverInfo;
      }
    } catch {}

    await new Promise(r => setTimeout(r, 250));
  }

  throw new Error(`Next.js dev server did not write server info within ${MAX_WAIT_MS / 1000}s`);
}

function cleanup() {
  log('Cleaning up...');
  try {
    fs.unlinkSync(SERVER_INFO_FILE);
  } catch {}
  for (const proc of processes) {
    if (proc && !proc.killed) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { shell: true });
        } else {
          process.kill(-proc.pid, 'SIGTERM');
        }
      } catch (e) {
        // Process may already be dead
      }
    }
  }
}

async function main() {
  const playwrightArgs = process.argv.slice(2);
  const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
  const configuredPort = configuredBaseUrl ? getPortFromUrl(configuredBaseUrl) : DEFAULT_PORT;
  const allowReuseServer = process.env.PLAYWRIGHT_REUSE_SERVER === '1';

  // Register cleanup handlers
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });
  process.on('exit', cleanup);

  try {
    let devUrl = configuredBaseUrl || buildBaseUrl(configuredPort, '127.0.0.1');

    // By default, own the Next server lifecycle for the test run.
    // Reuse only when explicitly requested.
    const devReady = allowReuseServer ? await checkServerHealth(devUrl) : false;

    if (devReady) {
      log(`Dev server already running at ${devUrl}, skipping startup`);
    } else {
      clearStaleWindowsNodeListener(devUrl);
      clearStaleWindowsRepoNodeProcesses();

      const requestedPort = configuredPort;

      devUrl = buildBaseUrl(requestedPort, '127.0.0.1');
      log(`Using Next.js base URL ${devUrl}`);

      const nextProc = startProcess(process.execPath, ['scripts/next-server.js', '--dev', '--hostname=127.0.0.1', `--port=${requestedPort}`, `--port-file=${SERVER_INFO_FILE}`], 'next-dev', {
        PORT: String(requestedPort),
        BIND_HOST: '127.0.0.1',
        PORT_FILE: SERVER_INFO_FILE,
        PLAYWRIGHT_BASE_URL: devUrl,
      });

      const serverInfo = await waitForServerInfo(nextProc);
      devUrl = serverInfo.baseUrl;
      if (serverInfo.port !== requestedPort) {
        log(`Next.js switched to available port ${serverInfo.port}`);
      }
      await waitForServer(devUrl, 'Next.js dev server', nextProc);
    }

    try {
      const serverInfo = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf8'));
      if (serverInfo?.baseUrl) {
        devUrl = serverInfo.baseUrl;
      }
    } catch {}

    log(`Using Next.js server at ${devUrl}`);
    log('Running Playwright tests...');

    // Run playwright with PLAYWRIGHT_SKIP_WEBSERVER=1
    const playwrightCli = require.resolve('@playwright/test/cli');
    const playwright = spawn(process.execPath, [playwrightCli, 'test', ...playwrightArgs], {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_WEBSERVER: '1',
        PLAYWRIGHT_BASE_URL: devUrl,
      },
    });

    const exitCode = await new Promise((resolve) => {
      playwright.on('close', resolve);
    });

    process.exit(exitCode);

  } catch (error) {
    console.error(`[test-e2e] Error: ${error.message}`);
    process.exit(1);
  }
}

main();
