import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = { ...mutableEnv };

function expectNoStoreNosniff(response: Response) {
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
}

function resetEnv() {
  for (const key of Object.keys(mutableEnv)) {
    delete mutableEnv[key];
  }
  Object.assign(mutableEnv, originalEnv);
  delete mutableEnv.API_KEY;
  delete mutableEnv.NODE_ENV;
}

describe('API route hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'test-api-key';
    mutableEnv.NEXTAUTH_SECRET = 'test-nextauth-secret';
    mutableEnv.ADMIN_USERNAME = 'admin';
    mutableEnv.ADMIN_PASSWORD = 'password';
    delete mutableEnv.REDIS_URL;
    delete mutableEnv.USE_REDIS;
  });

  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it('requires auth for simulation listing in production', async () => {
    const { GET } = await import('../app/api/simulation/route');
    const response = await GET(new NextRequest('http://localhost/api/simulation'));

    expect(response.status).toBe(401);
    await response.body?.cancel();
  }, 20_000);

  it('allows simulation listing with a valid API key', async () => {
    const { GET } = await import('../app/api/simulation/route');
    const response = await GET(new NextRequest('http://localhost/api/simulation', {
      headers: { 'X-API-Key': 'test-api-key' },
    }));

    expect(response.status).toBe(200);
    expectNoStoreNosniff(response);
    const body = await response.json();
    expect(Array.isArray(body.simulations)).toBe(true);
  }, 20_000);

  it('reports simulation listing storage failures without throwing', async () => {
    vi.doMock('@/lib/utils/redis-store', () => ({
      InMemorySimulationStore: class InMemorySimulationStore {},
      createSimulationStore: () => ({
        list: vi.fn().mockRejectedValue(new Error('store offline')),
        load: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      }),
      rehydrateSimulation: vi.fn(),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { GET } = await import('../app/api/simulation/route');
      const response = await GET(new NextRequest('http://localhost/api/simulation', {
        headers: { 'X-API-Key': 'test-api-key' },
      }));

      expect(response.status).toBe(500);
      expectNoStoreNosniff(response);
      await expect(response.json()).resolves.toEqual({ error: 'Failed to load simulations' });
    } finally {
      vi.doUnmock('@/lib/utils/redis-store');
    }
  });

  it('reports simulation load storage failures without throwing', async () => {
    vi.doMock('@/lib/utils/redis-store', () => ({
      InMemorySimulationStore: class InMemorySimulationStore {},
      createSimulationStore: () => ({
        list: vi.fn(),
        load: vi.fn().mockRejectedValue(new Error('store offline')),
        save: vi.fn(),
        delete: vi.fn(),
      }),
      rehydrateSimulation: vi.fn(),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { GET } = await import('../app/api/simulation/route');
      const response = await GET(new NextRequest('http://localhost/api/simulation?id=sim_1', {
        headers: { 'X-API-Key': 'test-api-key' },
      }));

      expect(response.status).toBe(500);
      expectNoStoreNosniff(response);
      await expect(response.json()).resolves.toEqual({ error: 'Failed to load simulation' });
    } finally {
      vi.doUnmock('@/lib/utils/redis-store');
    }
  });

  it('reports simulation delete storage failures without throwing', async () => {
    vi.doMock('@/lib/utils/redis-store', () => ({
      InMemorySimulationStore: class InMemorySimulationStore {},
      createSimulationStore: () => ({
        list: vi.fn(),
        load: vi.fn(),
        save: vi.fn(),
        delete: vi.fn().mockRejectedValue(new Error('store offline')),
      }),
      rehydrateSimulation: vi.fn(),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { DELETE } = await import('../app/api/simulation/route');
      const response = await DELETE(new NextRequest('http://localhost/api/simulation?id=sim_1', {
        headers: { 'X-API-Key': 'test-api-key' },
      }));

      expect(response.status).toBe(500);
      expectNoStoreNosniff(response);
      await expect(response.json()).resolves.toEqual({ error: 'Failed to delete simulation' });
    } finally {
      vi.doUnmock('@/lib/utils/redis-store');
    }
  });

  it('reports simulation data storage failures without throwing', async () => {
    vi.doMock('@/lib/utils/redis-store', () => ({
      InMemorySimulationStore: class InMemorySimulationStore {},
      createSimulationStore: () => ({
        list: vi.fn(),
        load: vi.fn().mockRejectedValue(new Error('store offline')),
        save: vi.fn(),
        delete: vi.fn(),
      }),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { GET } = await import('../app/api/simulation/data/route');
      const response = await GET(new NextRequest('http://localhost/api/simulation/data?id=sim_1', {
        headers: { 'X-API-Key': 'test-api-key' },
      }));

      expect(response.status).toBe(500);
      expectNoStoreNosniff(response);
      await expect(response.json()).resolves.toEqual({ error: 'Failed to load simulation data' });
    } finally {
      vi.doUnmock('@/lib/utils/redis-store');
    }
  });

  it('serves health checks with non-cacheable nosniff headers', async () => {
    const { GET } = await import('../app/api/healthz/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expectNoStoreNosniff(response);
  });

  it('serves simulation health checks with non-cacheable nosniff headers', async () => {
    const { GET } = await import('../app/api/healthz/simulate/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expectNoStoreNosniff(response);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.dataFiles)).toBe(true);
  });

  it('reports simulation health dependency failures without throwing', async () => {
    vi.doMock('node:fs/promises', () => ({
      access: vi.fn().mockRejectedValue(new Error('missing file')),
      stat: vi.fn(),
    }));

    try {
      const { GET } = await import('../app/api/healthz/simulate/route');
      const response = await GET();

      expect(response.status).toBe(503);
      expectNoStoreNosniff(response);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Required simulation data files are unavailable');
    } finally {
      vi.doUnmock('node:fs/promises');
    }
  });

  it('requires auth for protected artifact extensions', async () => {
    const artifactDir = path.join(process.cwd(), 'docs', '.test-artifacts');
    const artifactPath = path.join(artifactDir, 'private.log');
    await mkdir(artifactDir, { recursive: true });
    await writeFile(artifactPath, 'private log content', 'utf8');

    try {
      const { GET } = await import('../app/api/artifacts/[...slug]/route');
      const response = await GET(
        new Request('http://localhost/api/artifacts/docs/.test-artifacts/private.log'),
        { params: Promise.resolve({ slug: ['docs', '.test-artifacts', 'private.log'] }) }
      );

      expect(response.status).toBe(401);
      await response.body?.cancel();
    } finally {
      await rm(artifactDir, { recursive: true, force: true });
    }
  });

  it('rejects invalid artifact paths with non-cacheable nosniff headers', async () => {
    const { GET } = await import('../app/api/artifacts/[...slug]/route');
    const response = await GET(
      new Request('http://localhost/api/artifacts/../package.json'),
      { params: Promise.resolve({ slug: ['..', 'package.json'] }) }
    );

    expect(response.status).toBe(400);
    expectNoStoreNosniff(response);
    await response.body?.cancel();
  });

  it('serves artifacts with safe non-cacheable download headers', async () => {
    const artifactDir = path.join(process.cwd(), 'docs', '.test-artifacts');
    const artifactPath = path.join(artifactDir, 'report;v1.txt');
    await mkdir(artifactDir, { recursive: true });
    await writeFile(artifactPath, 'artifact content', 'utf8');

    try {
      const { GET } = await import('../app/api/artifacts/[...slug]/route');
      const response = await GET(
        new Request('http://localhost/api/artifacts/docs/.test-artifacts/report%3Bv1.txt'),
        { params: Promise.resolve({ slug: ['docs', '.test-artifacts', 'report;v1.txt'] }) }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
      expect(response.headers.get('content-disposition')).toBe('inline; filename="report_v1.txt"');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      await response.body?.cancel();
    } finally {
      await rm(artifactDir, { recursive: true, force: true });
    }
  });

  it('rejects invalid simulation export formats with non-cacheable nosniff headers', async () => {
    const { GET } = await import('../app/api/simulation/data/route');
    const response = await GET(new NextRequest('http://localhost/api/simulation/data?id=missing&format=xml', {
      headers: { 'X-API-Key': 'test-api-key' },
    }));

    expect(response.status).toBe(400);
    expectNoStoreNosniff(response);
    await response.body?.cancel();
  });

  it('rejects invalid feedback email before side effects', async () => {
    const { POST } = await import('../app/api/feedback/route');
    const response = await POST(new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.10',
      },
      body: JSON.stringify({
        type: 'bug',
        message: 'Something broke',
        email: 'not-an-email',
      }),
    }) as never);

    expect(response.status).toBe(400);
    expectNoStoreNosniff(response);
    await response.body?.cancel();
  });

  it('rejects malformed feedback payloads without throwing', async () => {
    const { POST } = await import('../app/api/feedback/route');
    const response = await POST(new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.12',
      },
      body: JSON.stringify({
        type: 123,
        message: 456,
        email: { nested: true },
      }),
    }) as never);

    expect(response.status).toBe(400);
    expectNoStoreNosniff(response);
    const body = await response.json();
    expect(body.error).toBe('message is required');
  });

  it('rate limits malformed feedback payload floods', async () => {
    const { POST } = await import('../app/api/feedback/route');
    let response: Response | null = null;

    for (let index = 0; index < 11; index += 1) {
      response = await POST(new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.14',
        },
        body: JSON.stringify({ message: 123 }),
      }) as never);
      await response.body?.cancel();
    }

    expect(response?.status).toBe(429);
    expectNoStoreNosniff(response!);
  });

  it('rejects invalid contact email before side effects', async () => {
    const { POST } = await import('../app/api/contact/route');
    const response = await POST(new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.11',
      },
      body: JSON.stringify({
        name: 'Tester',
        email: 'not-an-email',
        message: 'Hello',
      }),
    }) as never);

    expect(response.status).toBe(400);
    expectNoStoreNosniff(response);
    await response.body?.cancel();
  });

  it('rejects malformed contact payloads without throwing', async () => {
    const { POST } = await import('../app/api/contact/route');
    const response = await POST(new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.13',
      },
      body: JSON.stringify({
        name: 123,
        email: ['tester@example.com'],
        message: { nested: true },
      }),
    }) as never);

    expect(response.status).toBe(400);
    expectNoStoreNosniff(response);
    const body = await response.json();
    expect(body.error).toBe('name, email, and message are required');
  });

  it('rate limits malformed contact payload floods', async () => {
    const { POST } = await import('../app/api/contact/route');
    let response: Response | null = null;

    for (let index = 0; index < 6; index += 1) {
      response = await POST(new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.15',
        },
        body: JSON.stringify({ name: 123 }),
      }) as never);
      await response.body?.cancel();
    }

    expect(response?.status).toBe(429);
    expectNoStoreNosniff(response!);
  });
});
