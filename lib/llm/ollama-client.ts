/**
 * Ollama HTTP Client
 *
 * Wraps Ollama's /api/generate endpoint with concurrency limiting,
 * timeout/retry, and lazy availability checking.
 */

import { logger } from '../utils/logger';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  seed?: number;
  format?: 'json';
  options?: {
    num_predict?: number;
    [key: string]: unknown;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface OllamaClientConfig {
  baseUrl: string;
  maxConcurrent: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: OllamaClientConfig = {
  baseUrl: 'http://localhost:11434',
  maxConcurrent: 8,
  timeoutMs: 30000,
  maxRetries: 2,
  retryDelayMs: 1000,
};

export class OllamaClient {
  private config: OllamaClientConfig;
  private activeCalls: number = 0;
  private queue: Array<{
    resolve: (value: void) => void;
    reject: (reason: unknown) => void;
  }> = [];
  private availabilityChecked: boolean = false;
  private available: boolean = false;

  // Stats
  totalRequests: number = 0;
  totalErrors: number = 0;
  totalLatencyMs: number = 0;

  constructor(config: Partial<OllamaClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Ollama is available (lazy, cached after first call)
   */
  async isAvailable(): Promise<boolean> {
    if (this.availabilityChecked) {
      return this.available;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      this.available = response.ok;
    } catch {
      this.available = false;
    }

    this.availabilityChecked = true;
    if (!this.available) {
      logger.warn('Ollama is not available at', this.config.baseUrl);
    }
    return this.available;
  }

  /**
   * Reset availability cache (for testing or reconnection)
   */
  resetAvailability(): void {
    this.availabilityChecked = false;
    this.available = false;
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/api/tags`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = (await response.json()) as { models: OllamaModelInfo[] };
    return data.models || [];
  }

  /**
   * Generate a completion from Ollama
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    // Wait for concurrency slot
    await this.acquireConcurrencySlot();

    const startTime = Date.now();
    this.totalRequests++;

    try {
      return await this.generateWithRetry(request);
    } finally {
      this.totalLatencyMs += Date.now() - startTime;
      this.releaseConcurrencySlot();
    }
  }

  /**
   * Get average latency per request
   */
  get avgLatencyMs(): number {
    return this.totalRequests > 0 ? this.totalLatencyMs / this.totalRequests : 0;
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private async generateWithRetry(
    request: OllamaGenerateRequest
  ): Promise<OllamaGenerateResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const body = {
          model: request.model,
          prompt: request.prompt,
          system: request.system,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.3,
            seed: request.seed,
            num_predict: request.options?.num_predict ?? 256,
            ...request.options,
          },
          format: request.format,
        };

        const response = await this.fetchWithTimeout(
          `${this.config.baseUrl}/api/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'unknown error');
          throw new Error(`Ollama API error ${response.status}: ${errorText}`);
        }

        return (await response.json()) as OllamaGenerateResponse;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.config.maxRetries) {
          logger.debug(
            `Ollama request failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}): ${lastError.message}`
          );
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

    this.totalErrors++;
    throw lastError || new Error('Ollama request failed');
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async acquireConcurrencySlot(): Promise<void> {
    if (this.activeCalls < this.config.maxConcurrent) {
      this.activeCalls++;
      return;
    }

    // Wait for a slot to open
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  private releaseConcurrencySlot(): void {
    this.activeCalls--;

    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.activeCalls++;
      next.resolve();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
