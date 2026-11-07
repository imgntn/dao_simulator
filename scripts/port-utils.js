const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 7884;
const MAX_PORT_ATTEMPTS = 50;
const LOCK_DIR = path.join(os.tmpdir(), 'dao-simulator-ports');
// A lock only needs to cover the gap between choosing a port and the server binding it.
const LOCK_STARTUP_GRACE_MS = 60 * 1000;

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

// A live PID alone can't prove a lock is held: lock files can outlive their process, and
// after a container restart a new process often has the same PID. So once the startup
// window has passed, the lock only counts if something is really using the port.
async function isLockStale(lockPath, port, host) {
  let holderPid;
  try {
    holderPid = JSON.parse(fs.readFileSync(lockPath, 'utf8')).pid;
  } catch {
    // Unreadable: either it is still being written or a crash left it damaged.
  }

  if (holderPid !== undefined && !isProcessAlive(holderPid)) {
    return true;
  }

  // abs: a just-written file's timestamp can read slightly ahead of Date.now().
  const ageMs = Math.abs(Date.now() - fs.statSync(lockPath).mtimeMs);
  if (ageMs < LOCK_STARTUP_GRACE_MS) {
    return false;
  }

  return isPortAvailable(port, host);
}

async function tryAcquirePortLock(port, host = DEFAULT_HOST) {
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
      if (!(await isLockStale(lockPath, port, host))) {
        return null;
      }
      fs.rmSync(lockPath, { force: true });
      acquire();
    } catch {
      // Another process may have raced us on the lock file.
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
      } catch {
        // The lock may already have been removed by cleanup.
      }
    },
  };
}

async function findAndReserveAvailablePort(startPort = DEFAULT_PORT, host = DEFAULT_HOST, maxAttempts = MAX_PORT_ATTEMPTS) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    const lock = await tryAcquirePortLock(port, host);
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

// For deployments, where the proxy and health check expect one fixed port. This uses no
// lock files, so nothing left over from an earlier run can affect startup.
async function reserveExactPort(port, host = DEFAULT_HOST) {
  if (!(await isPortAvailable(port, host))) {
    throw new Error(`Port ${port} on ${host} is already in use`);
  }

  return { port, host, release() {} };
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
  isProcessAlive,
  isPortAvailable,
  reserveExactPort,
};
