import { afterEach, expect, test } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { findAvailablePort, isPortAvailable } from '../scripts/port-utils';

const children: ChildProcess[] = [];
const tempDirs: string[] = [];

async function waitFor(condition: () => Promise<boolean>, timeoutMs = 30000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms`);
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const child of children.splice(0)) {
    try {
      child.kill('SIGTERM');
    } catch {}
  }

  for (const dir of tempDirs.splice(0)) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {}
  }
});

test(
  'next-server chooses the next available port and writes the negotiated URL',
  async () => {
    const requestedPort = await findAvailablePort(43000);
    let nextPort = requestedPort + 1;
    while (!(await isPortAvailable(nextPort, '127.0.0.1'))) {
      nextPort += 1;
    }

    const occupied = net.createServer();
    await new Promise<void>((resolve) => occupied.listen(requestedPort, '127.0.0.1', resolve));

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'dao-sim-next-server-'));
    tempDirs.push(tempDir);
    const portFile = path.join(tempDir, 'server-info.json');

    const child = spawn(
      process.execPath,
      ['scripts/next-server.js', '--dev', '--hostname=127.0.0.1', `--port=${requestedPort}`, `--port-file=${portFile}`],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: '1',
        },
        stdio: 'ignore',
      },
    );
    children.push(child);

    await waitFor(() => fileExists(portFile), 30000);
    const serverInfo = JSON.parse(await readFile(portFile, 'utf8')) as { port: number; baseUrl: string };

    expect(serverInfo.port).toBe(nextPort);
    expect(serverInfo.baseUrl).toBe(`http://127.0.0.1:${nextPort}`);

    expect(child.exitCode).toBeNull();

    occupied.close();
  },
  90000,
);
