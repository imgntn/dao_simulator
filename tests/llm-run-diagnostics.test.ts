import { describe, expect, it } from 'vitest';
import type { DAOSimulation } from '../lib/engine/simulation';
import { LLMResponseCache } from '../lib/llm/response-cache';
import {
  collectLlmRunDiagnostics,
  llmRunDiagnosticError,
} from '../lib/research/llm-run-diagnostics';

describe('LLM run diagnostics', () => {
  it('archives request statistics and complete response-cache entries', () => {
    const cache = new LLMResponseCache();
    const rawKey = LLMResponseCache.makeRawKey('model', 'system', 'prompt', 4, 0.2);
    const key = LLMResponseCache.makeKey('model', 'system', 'prompt', 4, 0.2);
    cache.set(key, '{"vote":"yes"}', 'model', rawKey);
    cache.get(key, rawKey);
    const simulation = {
      ollamaClient: {
        totalRequests: 1,
        totalErrors: 0,
        avgLatencyMs: 12.5,
      },
      llmCache: cache,
    } as unknown as DAOSimulation;

    const diagnostics = collectLlmRunDiagnostics(simulation);
    expect(diagnostics).toEqual(expect.objectContaining({
      provider: 'ollama',
      totalRequests: 1,
      totalErrors: 0,
      averageLatencyMs: 12.5,
    }));
    expect(diagnostics?.cache?.entries[key]).toEqual(expect.objectContaining({
      response: '{"vote":"yes"}',
      rawKey,
    }));
    expect(llmRunDiagnosticError(diagnostics, true)).toBeNull();
  });

  it.each([
    [undefined, 'produced no Ollama diagnostics'],
    [{
      provider: 'ollama' as const,
      totalRequests: 0,
      totalErrors: 0,
      averageLatencyMs: 0,
      cache: { hits: 0, misses: 0, hitRate: 0, entries: {} },
    }, 'without any Ollama requests'],
    [{
      provider: 'ollama' as const,
      totalRequests: 1,
      totalErrors: 1,
      averageLatencyMs: 0,
      cache: { hits: 0, misses: 1, hitRate: 0, entries: {} },
    }, '1 exhausted request failures'],
    [{
      provider: 'ollama' as const,
      totalRequests: 1,
      totalErrors: 0,
      averageLatencyMs: 0,
      cache: null,
    }, 'did not preserve a response cache'],
  ])('fails closed for incomplete LLM evidence', (diagnostics, expected) => {
    expect(llmRunDiagnosticError(diagnostics, true)).toContain(expected);
    expect(llmRunDiagnosticError(diagnostics, false)).toBeNull();
  });
});
