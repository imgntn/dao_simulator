/**
 * E2E Test Helpers for Internationalization (i18n)
 *
 * Provides utilities for using centralized message strings in Playwright tests.
 * This ensures E2E tests stay in sync with UI text changes.
 *
 * @example
 * import { m, toRegex, toFormatRegex, format } from '../utils/i18n-helpers';
 *
 * // Use exact message
 * await page.getByRole('button', { name: m.controls.start }).click();
 *
 * // Use regex for flexible matching
 * await expect(page.getByRole('button', { name: toRegex(m.controls.start) })).toBeVisible();
 *
 * // Use format strings
 * await expect(page.getByText(format(m.tutorial.stepOf, { current: 1, total: 5 }))).toBeVisible();
 */

// Re-export messages and utilities from the main i18n module
export { messages, messages as m, format, toRegex, toFormatRegex, getMessage, t } from '../../lib/i18n';

import { messages } from '../../lib/i18n';

/**
 * Common button selectors using i18n strings
 */
export const buttons = {
  start: new RegExp(messages.controls.start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  startCity: new RegExp(messages.controls.startCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  stop: new RegExp(messages.controls.stop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  step: new RegExp(messages.controls.stepButton.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  reset: new RegExp(messages.controls.reset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  close: new RegExp(messages.common.close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
};

/**
 * Common tab selectors using i18n strings
 */
export const tabs = {
  overview: messages.tabs.overview,
  view3d: messages.tabs.view3d,
  charts: messages.tabs.charts,
  strategy: messages.tabs.strategy,
  reports: messages.tabs.reports,
};

/**
 * Common status text patterns
 */
export const status = {
  connected: new RegExp(messages.common.connected, 'i'),
  disconnected: new RegExp(messages.common.disconnected, 'i'),
  running: new RegExp(messages.common.running, 'i'),
  paused: new RegExp(messages.common.paused, 'i'),
  live: new RegExp(messages.common.live, 'i'),
};

/**
 * Panel button selectors
 */
export const panels = {
  tower: messages.panels.tower,
  city: messages.panels.city,
  network: messages.panels.network,
  price: messages.panels.price,
  heatmap: messages.panels.heatmap,
  daoReport: messages.panels.daoReport,
  runHistory: messages.panels.runHistory,
};

/**
 * Helper to create a case-insensitive regex from a message string
 */
export function createMatcher(message: string): RegExp {
  const escaped = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

/**
 * Helper to create a flexible regex that matches format strings with any values
 */
export function createFormatMatcher(template: string): RegExp {
  const escaped = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\{\\w+\\}/g, '\\S+');
  return new RegExp(escaped, 'i');
}
