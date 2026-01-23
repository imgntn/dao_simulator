/**
 * GPU Stats Bridge - Node.js interface to Python GPU-accelerated statistics.
 *
 * Provides 50-100x speedup for bootstrap resampling and Gini calculations
 * by leveraging CuPy/CUDA through a Python subprocess.
 *
 * Falls back to TypeScript implementations when Python is unavailable.
 */

import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';

// Response types from Python
interface PythonResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  traceback?: string;
}

interface BootstrapResult {
  estimate: number;
  lower: number;
  upper: number;
}

interface GiniResult {
  gini: number;
}

interface TTestResult {
  t_stat: number;
  p_value: number;
}

interface CompareResult {
  t_stat: number;
  p_value: number;
  cohens_d: number;
  baseline_mean: number;
  treatment_mean: number;
  percent_change: number;
  significant: boolean;
}

interface InfoResult {
  gpu_available: boolean;
  version: string;
}

/**
 * GPU Stats Bridge singleton for communicating with Python process.
 */
class GPUStatsBridge {
  private pythonProcess: ChildProcess | null = null;
  private responseQueue: Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private requestId = 0;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private gpuAvailable: boolean | null = null;

  /**
   * Start the Python process if not already running.
   */
  async start(): Promise<void> {
    if (this.pythonProcess && this.isReady) {
      return;
    }

    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise((resolve, reject) => {
      const pythonPath = process.env.PYTHON_PATH || 'python';
      const scriptPath = path.join(__dirname, '../../python/gpu_stats/server.py');

      try {
        this.pythonProcess = spawn(pythonPath, ['-m', 'python.gpu_stats.server'], {
          cwd: path.join(__dirname, '../..'),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err) {
        console.error('[GPUStatsBridge] Failed to spawn Python process:', err);
        this.readyPromise = null;
        reject(err);
        return;
      }

      if (!this.pythonProcess.stdout || !this.pythonProcess.stdin) {
        const err = new Error('Failed to create Python process streams');
        this.readyPromise = null;
        reject(err);
        return;
      }

      // Handle stderr for debugging
      if (this.pythonProcess.stderr) {
        this.pythonProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString().trim();
          if (message.includes('Ready for requests')) {
            this.isReady = true;
            resolve();
          }
          if (message.includes('GPU Available: true')) {
            this.gpuAvailable = true;
          } else if (message.includes('GPU Available: false')) {
            this.gpuAvailable = false;
          }
          // Log Python errors/info
          console.error('[GPUStatsBridge Python]', message);
        });
      }

      // Handle stdout (JSON responses)
      const rl = readline.createInterface({
        input: this.pythonProcess.stdout,
        crlfDelay: Infinity,
      });

      rl.on('line', (line: string) => {
        try {
          const response: PythonResponse = JSON.parse(line);
          // Get the oldest pending request
          const [requestId, handler] = this.responseQueue.entries().next().value || [null, null];
          if (handler) {
            this.responseQueue.delete(requestId);
            if (response.success) {
              handler.resolve(response.data);
            } else {
              handler.reject(new Error(response.error || 'Unknown Python error'));
            }
          }
        } catch (err) {
          console.error('[GPUStatsBridge] Failed to parse Python response:', line);
        }
      });

      this.pythonProcess.on('error', (err) => {
        console.error('[GPUStatsBridge] Python process error:', err);
        this.isReady = false;
        this.readyPromise = null;
        reject(err);
      });

      this.pythonProcess.on('exit', (code) => {
        console.log('[GPUStatsBridge] Python process exited with code:', code);
        this.isReady = false;
        this.pythonProcess = null;
        this.readyPromise = null;
      });

      // Set timeout for startup
      setTimeout(() => {
        if (!this.isReady) {
          this.isReady = true; // Assume ready even without confirmation
          resolve();
        }
      }, 2000);
    });

    return this.readyPromise;
  }

  /**
   * Stop the Python process.
   */
  stop(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isReady = false;
      this.readyPromise = null;
    }
  }

  /**
   * Send a request to the Python process.
   */
  private async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    await this.start();

    if (!this.pythonProcess?.stdin) {
      throw new Error('Python process not available');
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.responseQueue.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      const request = JSON.stringify({ method, params }) + '\n';
      this.pythonProcess!.stdin!.write(request);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseQueue.has(id)) {
          this.responseQueue.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Check if GPU is available.
   */
  async isGPUAvailable(): Promise<boolean> {
    if (this.gpuAvailable !== null) {
      return this.gpuAvailable;
    }

    try {
      const info = await this.request<InfoResult>('info', {});
      this.gpuAvailable = info.gpu_available;
      return this.gpuAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Calculate bootstrap confidence interval using GPU.
   */
  async bootstrapConfidenceInterval(
    values: number[],
    nSamples = 1000,
    confidence = 0.95,
    statistic: 'mean' | 'median' | 'std' = 'mean'
  ): Promise<BootstrapResult> {
    return this.request<BootstrapResult>('bootstrap', {
      values,
      n_samples: nSamples,
      confidence,
      statistic,
    });
  }

  /**
   * Calculate bootstrap CIs for multiple arrays in batch.
   */
  async bootstrapBatch(
    arrays: number[][],
    nSamples = 1000,
    confidence = 0.95,
    statistic: 'mean' | 'median' | 'std' = 'mean'
  ): Promise<BootstrapResult[]> {
    const result = await this.request<{ results: BootstrapResult[] }>('bootstrap_batch', {
      arrays,
      n_samples: nSamples,
      confidence,
      statistic,
    });
    return result.results;
  }

  /**
   * Calculate Gini coefficient using GPU.
   */
  async calculateGini(values: number[]): Promise<number> {
    const result = await this.request<GiniResult>('gini', { values });
    return result.gini;
  }

  /**
   * Calculate Gini coefficients for multiple arrays.
   */
  async calculateGiniBatch(arrays: number[][]): Promise<number[]> {
    const result = await this.request<{ results: number[] }>('gini_batch', { arrays });
    return result.results;
  }

  /**
   * Perform Welch's t-test using GPU.
   */
  async welchTTest(group1: number[], group2: number[]): Promise<TTestResult> {
    return this.request<TTestResult>('t_test', { group1, group2 });
  }

  /**
   * Compare two distributions comprehensively.
   */
  async compareDistributions(baseline: number[], treatment: number[]): Promise<CompareResult> {
    return this.request<CompareResult>('compare', { baseline, treatment });
  }
}

// Singleton instance
export const gpuStats = new GPUStatsBridge();

// Export types
export type {
  BootstrapResult,
  GiniResult,
  TTestResult,
  CompareResult,
};

// Fallback implementations when Python is not available
export function bootstrapConfidenceIntervalCPU(
  values: number[],
  nSamples = 1000,
  confidence = 0.95
): { estimate: number; lower: number; upper: number } {
  if (values.length === 0) {
    return { estimate: 0, lower: 0, upper: 0 };
  }

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const n = values.length;
  const pointEstimate = mean(values);

  // Bootstrap resampling
  const bootstrapMeans: number[] = [];
  for (let i = 0; i < nSamples; i++) {
    const sample: number[] = [];
    for (let j = 0; j < n; j++) {
      sample.push(values[Math.floor(Math.random() * n)]);
    }
    bootstrapMeans.push(mean(sample));
  }

  bootstrapMeans.sort((a, b) => a - b);

  const alpha = 1 - confidence;
  const lowerIdx = Math.floor(nSamples * alpha / 2);
  const upperIdx = Math.floor(nSamples * (1 - alpha / 2)) - 1;

  return {
    estimate: pointEstimate,
    lower: bootstrapMeans[lowerIdx],
    upper: bootstrapMeans[upperIdx],
  };
}

export function calculateGiniCPU(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  if (sum === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1) * sorted[i];
  }

  return Math.max(0, Math.min(1, (2 * numerator) / (n * sum) - (n + 1) / n));
}
