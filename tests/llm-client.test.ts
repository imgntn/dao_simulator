/**
 * Tests for Ollama HTTP Client
 *
 * All tests mock the Ollama HTTP endpoint — no real LLM required.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OllamaClient } from '@/lib/llm/ollama-client';

// =============================================================================
// Mock fetch
// =============================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOllamaResponse(response: string, overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      model: 'test-model',
      message: { role: 'assistant', content: response },
      done: true,
      total_duration: 1000000000,
      eval_count: 20,
      eval_duration: 500000000,
      ...overrides,
    }),
    text: async () => JSON.stringify({ message: { content: response } }),
  };
}

function mockTagsResponse(models: string[] = ['llama3.1:8b']) {
  return {
    ok: true,
    json: async () => ({
      models: models.map((name) => ({
        name,
        size: 4000000000,
        digest: 'abc123',
        modified_at: '2024-01-01T00:00:00Z',
      })),
    }),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    client = new OllamaClient({
      baseUrl: 'http://localhost:11434',
      maxConcurrent: 2,
      timeoutMs: 5000,
      maxRetries: 1,
      retryDelayMs: 10,
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('returns true when Ollama responds OK', async () => {
      mockFetch.mockResolvedValueOnce(mockTagsResponse());
      const available = await client.isAvailable();
      expect(available).toBe(true);
    });

    it('returns false when Ollama is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const available = await client.isAvailable();
      expect(available).toBe(false);
    });

    it('caches availability after first check', async () => {
      mockFetch.mockResolvedValueOnce(mockTagsResponse());
      await client.isAvailable();
      await client.isAvailable();
      // Only one fetch call despite two isAvailable calls
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('resetAvailability allows re-checking', async () => {
      mockFetch.mockRejectedValueOnce(new Error('down'));
      await client.isAvailable();
      expect(await client.isAvailable()).toBe(false);

      client.resetAvailability();
      mockFetch.mockResolvedValueOnce(mockTagsResponse());
      expect(await client.isAvailable()).toBe(true);
    });
  });

  describe('listModels', () => {
    it('returns list of available models', async () => {
      mockFetch.mockResolvedValueOnce(mockTagsResponse(['llama3.1:8b', 'qwen2.5:14b']));
      const models = await client.listModels();
      expect(models).toHaveLength(2);
      expect(models[0].name).toBe('llama3.1:8b');
      expect(models[1].name).toBe('qwen2.5:14b');
    });

    it('throws on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });
      await expect(client.listModels()).rejects.toThrow('Failed to list models');
    });
  });

  describe('generate', () => {
    it('sends correct request body', async () => {
      mockFetch.mockResolvedValueOnce(mockOllamaResponse('{"vote":"yes"}'));

      await client.generate({
        model: 'llama3.1:8b',
        prompt: 'test prompt',
        system: 'test system',
        temperature: 0.3,
        seed: 42,
        format: 'json',
        options: { num_predict: 256 },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:11434/api/chat');
      const body = JSON.parse(init.body);
      expect(body.model).toBe('llama3.1:8b');
      expect(body.messages).toEqual([
        { role: 'system', content: 'test system' },
        { role: 'user', content: 'test prompt' },
      ]);
      expect(body.stream).toBe(false);
      expect(body.think).toBe(false);
      expect(body.format).toBe('json');
    });

    it('returns parsed response', async () => {
      mockFetch.mockResolvedValueOnce(
        mockOllamaResponse('{"vote":"yes","reasoning":"good","confidence":0.9}')
      );

      const result = await client.generate({
        model: 'llama3.1:8b',
        prompt: 'test',
      });

      expect(result.response).toBe('{"vote":"yes","reasoning":"good","confidence":0.9}');
      expect(result.done).toBe(true);
    });

    it('retries on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(mockOllamaResponse('ok'));

      const result = await client.generate({
        model: 'test',
        prompt: 'test',
      });

      expect(result.response).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'));

      await expect(
        client.generate({ model: 'test', prompt: 'test' })
      ).rejects.toThrow('fail2');

      expect(client.totalErrors).toBe(1);
    });

    it('throws on non-OK HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'model not found',
      });
      // Will fail and retry, then fail again
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'model not found',
      });

      await expect(
        client.generate({ model: 'nonexistent', prompt: 'test' })
      ).rejects.toThrow('Ollama API error 404');
    });

    it('tracks statistics', async () => {
      mockFetch.mockResolvedValueOnce(mockOllamaResponse('ok'));
      await client.generate({ model: 'test', prompt: 'test' });

      expect(client.totalRequests).toBe(1);
      expect(client.totalErrors).toBe(0);
      expect(client.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('concurrency limiting', () => {
    it('limits concurrent requests', async () => {
      let activeCalls = 0;
      let maxConcurrent = 0;

      mockFetch.mockImplementation(async () => {
        activeCalls++;
        maxConcurrent = Math.max(maxConcurrent, activeCalls);
        // Simulate some processing time
        await new Promise((r) => setTimeout(r, 10));
        activeCalls--;
        return mockOllamaResponse('ok');
      });

      // Fire 4 requests with maxConcurrent=2
      const promises = Array.from({ length: 4 }, (_, i) =>
        client.generate({ model: 'test', prompt: `prompt_${i}` })
      );
      await Promise.all(promises);

      // Should never exceed 2 concurrent
      expect(maxConcurrent).toBeLessThanOrEqual(2);
      expect(client.totalRequests).toBe(4);
    });
  });
});
