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

const { spawn } = require('child_process');
const http = require('http');

const DEV_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:7884';
const MAX_WAIT_MS = 120000; // 2 minutes max wait for servers

const processes = [];

function log(msg) {
  console.log(`[test-e2e] ${msg}`);
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, name) {
  const start = Date.now();
  log(`Waiting for ${name} at ${url}...`);

  while (Date.now() - start < MAX_WAIT_MS) {
    if (await checkUrl(url)) {
      log(`${name} is ready`);
      return true;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error(`${name} failed to start within ${MAX_WAIT_MS / 1000}s`);
}

function startProcess(command, args, name) {
  const isWindows = process.platform === 'win32';
  const proc = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
    detached: !isWindows,
  });

  proc.stdout.on('data', (data) => {
    if (process.env.VERBOSE) {
      console.log(`[${name}] ${data.toString().trim()}`);
    }
  });

  proc.stderr.on('data', (data) => {
    if (process.env.VERBOSE) {
      console.error(`[${name}] ${data.toString().trim()}`);
    }
  });

  processes.push(proc);
  log(`Started ${name} (pid: ${proc.pid})`);
  return proc;
}

function cleanup() {
  log('Cleaning up...');
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

  // Register cleanup handlers
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });
  process.on('exit', cleanup);

  try {
    // Check if dev server is already running
    const devReady = await checkUrl(DEV_URL);

    if (devReady) {
      log('Dev server already running, skipping startup');
    } else {
      startProcess('npm', ['run', 'dev'], 'next-dev');
      await waitForServer(DEV_URL, 'Next.js dev server');
    }

    log('Running Playwright tests...');

    // Run playwright with PLAYWRIGHT_SKIP_WEBSERVER=1
    const playwright = spawn('npx', ['playwright', 'test', ...playwrightArgs], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_WEBSERVER: '1',
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
