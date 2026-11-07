import { afterEach, describe, expect, test } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  findAndReserveAvailablePort,
  findAvailablePort,
  reserveExactPort,
} from '../scripts/port-utils';

const HOST = '127.0.0.1';
const LOCK_DIR = path.join(os.tmpdir(), 'dao-simulator-ports');
const TEN_MINUTES_MS = 10 * 60 * 1000;

const cleanups: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) {
    await cleanup();
  }
});

function lockPath(port: number) {
  return path.join(LOCK_DIR, `${HOST}-${port}.lock`);
}

function plantLock(port: number, contents: string, ageMs = 0) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const file = lockPath(port);
  fs.writeFileSync(file, contents);
  if (ageMs !== 0) {
    const then = new Date(Date.now() - ageMs);
    fs.utimesSync(file, then, then);
  }
  cleanups.push(() => fs.rmSync(file, { force: true }));
}

function lockHeldBy(pid: number, port: number) {
  return JSON.stringify({ pid, port, host: HOST, token: 'planted' });
}

function deadPid() {
  const { pid } = spawnSync(process.execPath, ['-e', '']);
  return pid;
}

async function occupy(port: number) {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(port, HOST, resolve));
  cleanups.push(() => new Promise<void>((resolve) => server.close(() => resolve())));
}

async function freePort(start: number) {
  return findAvailablePort(start, HOST);
}

describe('findAndReserveAvailablePort', () => {
  test('reclaims an old lock whose PID was reused when the port is free', async () => {
    // Regression: after a container restart the app gets the same low PIDs, so the
    // old lock's PID looks alive. This took daosimulator.com down after a reboot.
    const port = await freePort(43100);
    plantLock(port, lockHeldBy(process.pid, port), TEN_MINUTES_MS);

    const reservation = await findAndReserveAvailablePort(port, HOST);
    cleanups.push(() => reservation.release());

    expect(reservation.port).toBe(port);
  });

  test('reclaims a lock left by a process that has exited', async () => {
    const port = await freePort(43200);
    plantLock(port, lockHeldBy(deadPid(), port));

    const reservation = await findAndReserveAvailablePort(port, HOST);
    cleanups.push(() => reservation.release());

    expect(reservation.port).toBe(port);
  });

  test('respects a recent lock from a live process that is still starting up', async () => {
    const port = await freePort(43300);
    plantLock(port, lockHeldBy(process.pid, port));

    const reservation = await findAndReserveAvailablePort(port, HOST);
    cleanups.push(() => reservation.release());

    expect(reservation.port).toBeGreaterThan(port);
  });

  test('treats a lock timestamped slightly in the future as recent', async () => {
    // A just-written file's timestamp can read ahead of Date.now().
    const port = await freePort(43350);
    plantLock(port, lockHeldBy(process.pid, port), -1000);

    const reservation = await findAndReserveAvailablePort(port, HOST);
    cleanups.push(() => reservation.release());

    expect(reservation.port).toBeGreaterThan(port);
  });

  test('respects an old lock from a live process that is serving on the port', async () => {
    const port = await freePort(43400);
    await occupy(port);
    plantLock(port, lockHeldBy(process.pid, port), TEN_MINUTES_MS);

    const reservation = await findAndReserveAvailablePort(port, HOST);
    cleanups.push(() => reservation.release());

    expect(reservation.port).toBeGreaterThan(port);
  });

  test('reclaims an old unreadable lock but not one that may still be being written', async () => {
    const oldPort = await freePort(43500);
    plantLock(oldPort, '', TEN_MINUTES_MS);
    const reclaimed = await findAndReserveAvailablePort(oldPort, HOST);
    cleanups.push(() => reclaimed.release());
    expect(reclaimed.port).toBe(oldPort);

    const newPort = await freePort(43600);
    plantLock(newPort, '');
    const skipped = await findAndReserveAvailablePort(newPort, HOST);
    cleanups.push(() => skipped.release());
    expect(skipped.port).toBeGreaterThan(newPort);
  });

  test('releasing a reservation removes its lock', async () => {
    const port = await freePort(43700);
    const reservation = await findAndReserveAvailablePort(port, HOST);

    expect(fs.existsSync(lockPath(port))).toBe(true);
    reservation.release();
    expect(fs.existsSync(lockPath(port))).toBe(false);
  });
});

describe('reserveExactPort', () => {
  test('ignores lock files and returns the requested port', async () => {
    const port = await freePort(43800);
    plantLock(port, lockHeldBy(process.pid, port));

    const reservation = await reserveExactPort(port, HOST);

    expect(reservation.port).toBe(port);
    reservation.release();
  });

  test('fails with a clear error when the port is really in use', async () => {
    const port = await freePort(43900);
    await occupy(port);

    await expect(reserveExactPort(port, HOST)).rejects.toThrow(`Port ${port} on ${HOST} is already in use`);
  });
});

describe('next-server in production', () => {
  function runProductionServer(port: number) {
    const child = spawn(
      process.execPath,
      ['scripts/next-server.js', `--hostname=${HOST}`, `--port=${port}`],
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    cleanups.push(() => {
      child.kill('SIGKILL');
    });
    return child;
  }

  test('exits instead of moving to another port when its port is taken', async () => {
    const port = await freePort(44000);
    await occupy(port);

    const child = runProductionServer(port);
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const code = await new Promise((resolve) => child.on('exit', resolve));

    expect(code).toBe(1);
    expect(output).toContain(`Port ${port} on ${HOST} is already in use`);
    expect(output).not.toContain('switching to');
  }, 30000);

  test('uses its configured port despite a stale lock', async () => {
    const port = await freePort(44100);
    plantLock(port, lockHeldBy(process.pid, port));

    const child = runProductionServer(port);
    const launched = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`No launch line. Output: ${output}`)), 20000);
      child.stdout.on('data', (chunk) => {
        output += chunk;
        if (output.includes('Launching Next')) {
          clearTimeout(timer);
          resolve(output);
        }
      });
    });

    expect(launched).toContain(`http://${HOST}:${port}`);
    expect(launched).not.toContain('switching to');
  }, 30000);
});
