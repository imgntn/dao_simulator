/**
 * Worker Pool Manager
 *
 * Manages a pool of child processes for parallel simulation execution.
 * Uses child_process.fork() for better TypeScript/tsx compatibility.
 * Handles task distribution, result collection, and graceful shutdown.
 */

import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import type { WorkerTask, WorkerResult } from './simulation-worker';
import type { RunResult } from './experiment-config';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkerPoolConfig {
  /** Number of worker processes (default: CPU cores - 1) */
  workerCount?: number;
  /** Path to the worker script */
  workerScript?: string;
}

interface PendingTask {
  task: WorkerTask;
  resolve: (result: RunResult) => void;
  reject: (error: Error) => void;
}

interface ProcessState {
  process: ChildProcess;
  busy: boolean;
  taskCount: number;
  currentTaskId?: number;
}

// =============================================================================
// WORKER POOL
// =============================================================================

export class WorkerPool {
  private processes: ProcessState[] = [];
  private taskQueue: PendingTask[] = [];
  private pendingTasks: Map<number, PendingTask> = new Map();
  private nextTaskId: number = 0;
  private isShuttingDown: boolean = false;
  private workerScript: string;
  private workerCount: number;

  constructor(config: WorkerPoolConfig = {}) {
    this.workerCount = config.workerCount ?? Math.max(1, os.cpus().length - 1);
    this.workerScript = config.workerScript ?? this.resolveWorkerScript();

    // Create worker processes
    for (let i = 0; i < this.workerCount; i++) {
      this.createProcess();
    }
  }

  /**
   * Check if we're running with tsx
   */
  private isTsxMode(): boolean {
    return process.argv.some(arg => arg.includes('tsx')) ||
           process.execArgv.some(arg => arg.includes('tsx'));
  }

  /**
   * Resolve the worker script path
   */
  private resolveWorkerScript(): string {
    // Always use the fork-worker which is designed for child_process.fork()
    return path.join(__dirname, 'fork-worker.ts');
  }

  /**
   * Create a new worker process
   */
  private createProcess(): void {
    const execArgv = this.isTsxMode() ? ['--import', 'tsx'] : [];

    const child = fork(this.workerScript, [], {
      execArgv,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    const processState: ProcessState = {
      process: child,
      busy: false,
      taskCount: 0,
    };

    child.on('message', (result: WorkerResult) => {
      this.handleProcessResult(processState, result);
    });

    child.on('error', (error) => {
      console.error('Worker process error:', error);
      this.handleProcessError(processState, error);
    });

    child.on('exit', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`Worker process exited with code ${code}, restarting...`);
        this.replaceProcess(processState);
      }
    });

    // Suppress stdout/stderr from workers
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});

    this.processes.push(processState);
  }

  /**
   * Replace a failed process
   */
  private replaceProcess(oldState: ProcessState): void {
    const index = this.processes.indexOf(oldState);
    if (index !== -1) {
      this.processes.splice(index, 1);
    }

    if (!this.isShuttingDown) {
      this.createProcess();
    }
  }

  /**
   * Handle result from worker process
   */
  private handleProcessResult(state: ProcessState, result: WorkerResult): void {
    state.busy = false;
    state.taskCount++;
    state.currentTaskId = undefined;

    const pending = this.pendingTasks.get(result.taskId);
    if (pending) {
      this.pendingTasks.delete(result.taskId);

      if (result.success && result.result) {
        pending.resolve(result.result);
      } else {
        pending.reject(new Error(result.error || 'Unknown worker error'));
      }
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker process error
   */
  private handleProcessError(state: ProcessState, error: Error): void {
    state.busy = false;

    // Reject the current task if any
    if (state.currentTaskId !== undefined) {
      const pending = this.pendingTasks.get(state.currentTaskId);
      if (pending) {
        pending.reject(error);
        this.pendingTasks.delete(state.currentTaskId);
      }
    }
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Find an available process
    const availableProcess = this.processes.find(p => !p.busy && p.process.connected);
    if (!availableProcess) return;

    // Get next task from queue
    const pending = this.taskQueue.shift();
    if (!pending) return;

    // Assign task to process
    availableProcess.busy = true;
    availableProcess.currentTaskId = pending.task.taskId;
    this.pendingTasks.set(pending.task.taskId, pending);
    availableProcess.process.send(pending.task);
  }

  /**
   * Submit a task to the pool
   */
  async submit(task: Omit<WorkerTask, 'taskId'>): Promise<RunResult> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    const taskId = this.nextTaskId++;
    const fullTask: WorkerTask = { ...task, taskId };

    return new Promise((resolve, reject) => {
      const pending: PendingTask = { task: fullTask, resolve, reject };

      // Find an available process
      const availableProcess = this.processes.find(p => !p.busy && p.process.connected);

      if (availableProcess) {
        // Directly assign to available process
        availableProcess.busy = true;
        availableProcess.currentTaskId = taskId;
        this.pendingTasks.set(taskId, pending);
        availableProcess.process.send(fullTask);
      } else {
        // Queue the task
        this.taskQueue.push(pending);
      }
    });
  }

  /**
   * Submit multiple tasks and collect results
   */
  async submitAll(tasks: Omit<WorkerTask, 'taskId'>[]): Promise<RunResult[]> {
    const promises = tasks.map(task => this.submit(task));
    return Promise.all(promises);
  }

  /**
   * Get pool statistics
   */
  getStats(): { workerCount: number; busyWorkers: number; queuedTasks: number; pendingTasks: number } {
    return {
      workerCount: this.processes.length,
      busyWorkers: this.processes.filter(p => p.busy).length,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
    };
  }

  /**
   * Shutdown the pool gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Wait for pending tasks to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    while (this.pendingTasks.size > 0 || this.taskQueue.length > 0) {
      if (Date.now() - startTime > timeout) {
        console.warn('Shutdown timeout, forcing shutdown...');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Kill all processes
    for (const state of this.processes) {
      if (state.process.connected) {
        state.process.kill();
      }
    }

    this.processes = [];
  }

  /**
   * Force shutdown immediately
   */
  async forceShutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Reject all pending tasks
    for (const [, pending] of this.pendingTasks) {
      pending.reject(new Error('Worker pool force shutdown'));
    }
    this.pendingTasks.clear();
    this.taskQueue = [];

    // Kill all processes
    for (const state of this.processes) {
      if (state.process.connected) {
        state.process.kill('SIGKILL');
      }
    }

    this.processes = [];
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get the recommended number of workers based on CPU cores
 */
export function getRecommendedWorkerCount(): number {
  const cpuCount = os.cpus().length;
  // Leave one core free for the main thread and OS
  return Math.max(1, cpuCount - 1);
}

/**
 * Create a worker pool with recommended settings
 */
export function createWorkerPool(workerCount?: number): WorkerPool {
  return new WorkerPool({
    workerCount: workerCount ?? getRecommendedWorkerCount(),
  });
}
