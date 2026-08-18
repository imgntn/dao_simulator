import { canonicalJson } from './campaign-manifest';

export interface LlmTaskPlan {
  experimentId: string;
  tasks: Array<{ daoConfig: unknown }>;
}

export interface LlmSamplingProfile {
  experimentId: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  thinking: boolean;
  contextSize: number;
  seed: number | null;
}

export interface OllamaModelProvenance {
  name: string;
  digest: string;
  sizeBytes: number;
  modifiedAt: string;
  format: string;
  family: string;
  parameterSize: string;
  quantizationLevel: string;
}

export interface LlmProviderProvenance {
  schemaVersion: '1.0.0';
  provider: 'ollama';
  baseUrl: string;
  providerVersion: string;
  requestFormat: 'json';
  retryPolicy: {
    maxRetries: 2;
    retryDelayMs: 1000;
    backoff: 'linear';
  };
  models: OllamaModelProvenance[];
  samplingProfiles: LlmSamplingProfile[];
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    digest?: string;
    size?: number;
    modified_at?: string;
    details?: {
      format?: string;
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizedBaseUrl(value: unknown): string {
  const raw = typeof value === 'string' && value.trim()
    ? value.trim()
    : 'http://localhost:11434';
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`Invalid Ollama base URL: ${raw}`);
  }
  return url.toString().replace(/\/$/, '');
}

export function collectLlmSamplingProfiles(plans: LlmTaskPlan[]): LlmSamplingProfile[] {
  const profiles = new Map<string, LlmSamplingProfile>();
  for (const plan of plans) {
    for (const task of plan.tasks) {
      const config = record(task.daoConfig);
      if (config.llm_enabled !== true) continue;
      const baseUrl = normalizedBaseUrl(config.llm_base_url);
      const models = new Set(
        [config.llm_default_model, config.llm_premium_model]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .map(value => value.trim())
      );
      if (models.size === 0) {
        throw new Error(`LLM-enabled task in ${plan.experimentId} has no model`);
      }
      for (const model of models) {
        const profile: LlmSamplingProfile = {
          experimentId: plan.experimentId,
          baseUrl,
          model,
          temperature: finiteNumber(config.llm_temperature, 0.3),
          maxTokens: finiteNumber(config.llm_max_tokens, 256),
          timeoutMs: finiteNumber(config.llm_timeout_ms, 30_000),
          thinking: config.llm_enable_thinking === true,
          contextSize: finiteNumber(config.llm_context_size, 0),
          seed: typeof config.llm_seed === 'number' && Number.isSafeInteger(config.llm_seed)
            ? config.llm_seed
            : null,
        };
        profiles.set(canonicalJson(profile), profile);
      }
    }
  }
  return [...profiles.values()].sort((left, right) =>
    canonicalJson(left).localeCompare(canonicalJson(right))
  );
}

async function fetchJson(
  url: string,
  fetchImplementation: typeof fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImplementation(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new Error(
      `Ollama preflight could not reach ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (!response.ok) {
    throw new Error(`Ollama preflight failed for ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

export async function captureLlmProviderProvenance(
  plans: LlmTaskPlan[],
  fetchImplementation: typeof fetch = fetch,
): Promise<LlmProviderProvenance[]> {
  const profiles = collectLlmSamplingProfiles(plans);
  const byBaseUrl = new Map<string, LlmSamplingProfile[]>();
  for (const profile of profiles) {
    const group = byBaseUrl.get(profile.baseUrl) ?? [];
    group.push(profile);
    byBaseUrl.set(profile.baseUrl, group);
  }

  const providers: LlmProviderProvenance[] = [];
  for (const [baseUrl, providerProfiles] of [...byBaseUrl].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const versionPayload = record(await fetchJson(`${baseUrl}/api/version`, fetchImplementation));
    const providerVersion = typeof versionPayload.version === 'string'
      ? versionPayload.version
      : '';
    if (!providerVersion) throw new Error(`Ollama at ${baseUrl} did not report a version`);

    const tags = await fetchJson(`${baseUrl}/api/tags`, fetchImplementation) as OllamaTagsResponse;
    const available = new Map(
      (tags.models ?? []).flatMap(model => {
        const name = model.name ?? model.model;
        return name ? [[name, model] as const] : [];
      })
    );
    const requestedModels = [...new Set(providerProfiles.map(profile => profile.model))].sort();
    const missing = requestedModels.filter(model => !available.has(model));
    if (missing.length > 0) {
      throw new Error(`Ollama at ${baseUrl} is missing required models: ${missing.join(', ')}`);
    }

    const models = requestedModels.map(name => {
      const model = available.get(name)!;
      const digest = model.digest ?? '';
      if (!/^[a-f0-9]{64}$/i.test(digest)) {
        throw new Error(`Ollama model ${name} has an invalid digest`);
      }
      const details = model.details ?? {};
      return {
        name,
        digest: digest.toLowerCase(),
        sizeBytes: finiteNumber(model.size, 0),
        modifiedAt: model.modified_at ?? '',
        format: details.format ?? 'unknown',
        family: details.family ?? 'unknown',
        parameterSize: details.parameter_size ?? 'unknown',
        quantizationLevel: details.quantization_level ?? 'unknown',
      };
    });

    providers.push({
      schemaVersion: '1.0.0',
      provider: 'ollama',
      baseUrl,
      providerVersion,
      requestFormat: 'json',
      retryPolicy: {
        maxRetries: 2,
        retryDelayMs: 1000,
        backoff: 'linear',
      },
      models,
      samplingProfiles: providerProfiles,
    });
  }
  return providers;
}
