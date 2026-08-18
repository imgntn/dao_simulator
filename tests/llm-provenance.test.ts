import { describe, expect, it, vi } from 'vitest';
import {
  captureLlmProviderProvenance,
  collectLlmSamplingProfiles,
} from '../lib/research/llm-provenance';

const taskPlans = [{
  experimentId: 'llm-study',
  tasks: [{
    daoConfig: {
      llm_enabled: true,
      llm_base_url: 'http://localhost:11434',
      llm_default_model: 'model:one',
      llm_premium_model: 'model:one',
      llm_temperature: 0.2,
      llm_max_tokens: 512,
      llm_timeout_ms: 5_000,
      llm_enable_thinking: true,
      llm_context_size: 4096,
      llm_seed: 7,
    },
  }],
}];

describe('LLM campaign provenance', () => {
  it('deduplicates complete sampling profiles', () => {
    const profiles = collectLlmSamplingProfiles(taskPlans);
    expect(profiles).toEqual([expect.objectContaining({
      experimentId: 'llm-study',
      baseUrl: 'http://localhost:11434',
      model: 'model:one',
      temperature: 0.2,
      maxTokens: 512,
      timeoutMs: 5_000,
      thinking: true,
      contextSize: 4096,
      seed: 7,
    })]);
  });

  it('captures provider version and exact model digest', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/api/version')) {
        return new Response(JSON.stringify({ version: '1.2.3' }), { status: 200 });
      }
      return new Response(JSON.stringify({
        models: [{
          name: 'model:one',
          digest: 'a'.repeat(64),
          size: 123,
          modified_at: '2026-01-01T00:00:00Z',
          details: {
            format: 'gguf',
            family: 'test',
            parameter_size: '4B',
            quantization_level: 'Q8_0',
          },
        }],
      }), { status: 200 });
    });

    const [provider] = await captureLlmProviderProvenance(
      taskPlans,
      fetchMock as typeof fetch,
    );
    expect(provider.providerVersion).toBe('1.2.3');
    expect(provider.models[0]).toEqual(expect.objectContaining({
      name: 'model:one',
      digest: 'a'.repeat(64),
      quantizationLevel: 'Q8_0',
    }));
    expect(provider).not.toHaveProperty('capturedAt');
  });

  it('fails closed when a required model is absent', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      new Response(
        JSON.stringify(String(input).endsWith('/api/version')
          ? { version: '1.2.3' }
          : { models: [] }),
        { status: 200 },
      )
    );
    await expect(captureLlmProviderProvenance(taskPlans, fetchMock as typeof fetch))
      .rejects.toThrow(/missing required models: model:one/);
  });
});
