/**
 * Centralized logger for the DAO Simulator.
 *
 * Provides consistent log formatting with configurable verbosity.
 * All log output goes through console but can be filtered by level
 * and optionally silenced (e.g. during tests).
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('Simulation started', { steps: 720 });
 *   logger.warn('Quorum not met', { proposal: 'P-1' });
 *   logger.error('Failed to load profile', error);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

class Logger {
  private level: LogLevel = 'warn';
  private prefix: string;

  constructor(prefix: string = 'dao-sim') {
    this.prefix = prefix;
  }

  /** Set the minimum log level. Messages below this level are suppressed. */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  /** Create a child logger with a sub-prefix */
  child(subPrefix: string): Logger {
    const child = new Logger(`${this.prefix}:${subPrefix}`);
    child.level = this.level;
    return child;
  }

  debug(message: string, ...args: unknown[]): void {
    if (LEVEL_ORDER[this.level] <= LEVEL_ORDER.debug) {
      console.log(`[${this.prefix}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (LEVEL_ORDER[this.level] <= LEVEL_ORDER.info) {
      console.log(`[${this.prefix}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (LEVEL_ORDER[this.level] <= LEVEL_ORDER.warn) {
      console.warn(`[${this.prefix}] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (LEVEL_ORDER[this.level] <= LEVEL_ORDER.error) {
      console.error(`[${this.prefix}] ${message}`, ...args);
    }
  }
}

/** Global logger instance — default level is 'warn' */
export const logger = new Logger();

export { Logger };
