#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  DEFAULT_HOST,
  DEFAULT_PORT,
  buildBaseUrl,
  findAndReserveAvailablePort,
} = require('./port-utils');

function parseArgs(argv) {
  const parsed = {
    dev: false,
    hostname: process.env.BIND_HOST || DEFAULT_HOST,
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : DEFAULT_PORT,
    portFile: process.env.PORT_FILE || '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dev') {
      parsed.dev = true;
      continue;
    }

    if (arg === '--hostname' && argv[index + 1]) {
      parsed.hostname = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--hostname=')) {
      parsed.hostname = arg.split('=')[1];
      continue;
    }

    if (arg === '--port' && argv[index + 1]) {
      parsed.port = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg.startsWith('--port=')) {
      parsed.port = Number.parseInt(arg.split('=')[1], 10);
      continue;
    }

    if (arg === '--port-file' && argv[index + 1]) {
      parsed.portFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--port-file=')) {
      parsed.portFile = arg.split('=')[1];
    }
  }

  if (!Number.isFinite(parsed.port) || parsed.port <= 0) {
    parsed.port = DEFAULT_PORT;
  }

  return parsed;
}

function writePortFile(portFile, payload) {
  if (!portFile) return;

  fs.mkdirSync(path.dirname(portFile), { recursive: true });
  fs.writeFileSync(portFile, JSON.stringify(payload, null, 2));
}

async function main() {
  const { dev, hostname, port: requestedPort, portFile } = parseArgs(process.argv.slice(2));

  const portReservation = await findAndReserveAvailablePort(requestedPort, hostname);
  const chosenPort = portReservation.port;
  if (chosenPort !== requestedPort) {
    console.warn(`[next-server] Port ${requestedPort} is busy, switching to ${chosenPort}`);
  }

  const mode = dev ? 'dev' : 'start';
  const nextBin = require.resolve('next/dist/bin/next');
  const nextArgs = [nextBin, mode, '-H', hostname, '-p', String(chosenPort)];
  if (dev) {
    nextArgs.push('--turbopack');
  }

  const baseUrl = buildBaseUrl(chosenPort, hostname === '0.0.0.0' ? 'localhost' : hostname);
  writePortFile(portFile, {
    dev,
    hostname,
    port: chosenPort,
    requestedPort,
    baseUrl,
    pid: process.pid,
  });

  console.log(`[next-server] Launching Next ${mode} on ${baseUrl}`);

  const child = spawn(process.execPath, nextArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(chosenPort),
    },
    shell: false,
    windowsHide: true,
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  const cleanup = () => {
    portReservation.release();
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));
  process.on('exit', cleanup);

  child.on('exit', (code, signal) => {
    cleanup();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error('[next-server] Failed to start:', error);
  process.exit(1);
});
