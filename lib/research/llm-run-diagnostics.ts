import type { DAOSimulation } from '../engine/simulation';
import type { CacheEntry } from '../llm/response-cache';

export interface LlmRunDiagnostics {
  provider: 'ollama';
  totalRequests: number;
  totalErrors: number;
  averageLatencyMs: number;
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    entries: Record<string, CacheEntry>;
  } | null;
}

export function collectLlmRunDiagnostics(
  simulation: DAOSimulation,
): LlmRunDiagnostics | undefined {
  if (!simulation.ollamaClient && !simulation.llmCache) return undefined;
  const stats = simulation.llmCache?.stats;
  return {
    provider: 'ollama',
    totalRequests: simulation.ollamaClient?.totalRequests ?? 0,
    totalErrors: simulation.ollamaClient?.totalErrors ?? 0,
    averageLatencyMs: simulation.ollamaClient?.avgLatencyMs ?? 0,
    cache: simulation.llmCache && stats
      ? {
          hits: stats.hits,
          misses: stats.misses,
          hitRate: stats.hitRate,
          entries: simulation.llmCache.export(),
        }
      : null,
  };
}

export function llmRunDiagnosticError(
  diagnostics: LlmRunDiagnostics | undefined,
  llmRequired: boolean,
): string | null {
  if (!llmRequired) return null;
  if (!diagnostics) return 'LLM-enabled run produced no Ollama diagnostics';
  if (diagnostics.totalErrors > 0) {
    return `Ollama reported ${diagnostics.totalErrors} exhausted request failures`;
  }
  if (diagnostics.totalRequests <= 0) {
    return 'LLM-enabled run completed without any Ollama requests';
  }
  if (!diagnostics.cache) {
    return 'LLM-enabled run did not preserve a response cache';
  }
  const entryCount = Object.keys(diagnostics.cache.entries).length;
  if (entryCount <= 0) {
    return 'LLM-enabled run preserved an empty response cache';
  }
  return null;
}
