const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 7884;
const MAX_PORT_ATTEMPTS = 50;
const LOCK_DIR = path.join(os.tmpdir(), 'dao-simulator-ports');

function isPortAvailable(port, host = DEFAULT_HOST) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort = DEFAULT_PORT, host = DEFAULT_HOST, maxAttempts = MAX_PORT_ATTEMPTS) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }

  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

function isProcessAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function lockPathForPort(port, host = DEFAULT_HOST) {
  const safeHost = host.replace(/[^a-zA-Z0-9.-]/g, '_');
  return path.join(LOCK_DIR, `${safeHost}-${port}.lock`);
}

function tryAcquirePortLock(port, host = DEFAULT_HOST) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });

  const lockPath = lockPathForPort(port, host);
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify({ pid: process.pid, port, host, token, createdAt: new Date().toISOString() });

  const acquire = () => {
    const fd = fs.openSync(lockPath, 'wx');
    try {
      fs.writeFileSync(fd, payload);
    } finally {
      fs.closeSync(fd);
    }
  };

  try {
    acquire();
  } catch (error) {
    if (error.code !== 'EEXIST') {
      return null;
    }

    try {
      const existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (isProcessAlive(existing.pid)) {
        return null;
      }
      fs.unlinkSync(lockPath);
      acquire();
    } catch {
      return null;
    }
  }

  return {
    port,
    host,
    release() {
      try {
        const existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (existing.token === token) {
          fs.unlinkSync(lockPath);
        }
      } catch {}
    },
  };
}

async function findAndReserveAvailablePort(startPort = DEFAULT_PORT, host = DEFAULT_HOST, maxAttempts = MAX_PORT_ATTEMPTS) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    const lock = tryAcquirePortLock(port, host);
    if (!lock) {
      continue;
    }

    if (await isPortAvailable(port, host)) {
      return lock;
    }

    lock.release();
  }

  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

function getPortFromUrl(baseUrl) {
  const { port, protocol } = new URL(baseUrl);
  if (port) return Number(port);
  return protocol === 'https:' ? 443 : 80;
}

function buildBaseUrl(port, hostname = DEFAULT_HOST) {
  return `http://${hostname}:${port}`;
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  MAX_PORT_ATTEMPTS,
  buildBaseUrl,
  findAndReserveAvailablePort,
  findAvailablePort,
  getPortFromUrl,
  isPortAvailable,
};
