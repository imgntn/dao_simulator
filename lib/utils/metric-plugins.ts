// Metric Plugins - custom metric registration system
// Port from utils/metric_plugins.py

type MetricFunction = (model: any) => Record<string, any>;

/**
 * Metric registry for custom metrics
 */
const METRIC_REGISTRY = new Map<string, MetricFunction>();

/**
 * Register a metric function under a given name
 */
export function registerMetric(name: string, func: MetricFunction): void {
  METRIC_REGISTRY.set(name.toLowerCase(), func);
}

/**
 * Get all registered metrics
 */
export function getMetrics(): Map<string, MetricFunction> {
  return new Map(METRIC_REGISTRY);
}

/**
 * Get a specific metric by name
 */
export function getMetric(name: string): MetricFunction | undefined {
  return METRIC_REGISTRY.get(name.toLowerCase());
}

/**
 * List all metric names
 */
export function listMetrics(): string[] {
  return Array.from(METRIC_REGISTRY.keys());
}

/**
 * Check if a metric is registered
 */
export function hasMetric(name: string): boolean {
  return METRIC_REGISTRY.has(name.toLowerCase());
}

/**
 * Unregister a metric
 */
export function unregisterMetric(name: string): boolean {
  return METRIC_REGISTRY.delete(name.toLowerCase());
}

/**
 * Clear all registered metrics
 */
export function clearMetrics(): void {
  METRIC_REGISTRY.clear();
}

/**
 * Compute all registered metrics for a model
 */
export function computeAllMetrics(model: any): Record<string, any> {
  const results: Record<string, any> = {};

  for (const [name, func] of METRIC_REGISTRY.entries()) {
    try {
      const metricData = func(model);
      Object.assign(results, metricData);
    } catch (error) {
      console.warn(`Metric ${name} failed:`, error);
    }
  }

  return results;
}

// Example metric: Token concentration
registerMetric('token_concentration', (model) => {
  if (!model.dao || !model.dao.members || model.dao.members.length === 0) {
    return { token_concentration: 0 };
  }

  const tokens = model.dao.members.map((m: any) => m.tokens);
  const totalTokens = tokens.reduce((sum: number, t: number) => sum + t, 0);

  if (totalTokens === 0) {
    return { token_concentration: 0 };
  }

  // Herfindahl index
  const concentration = tokens.reduce(
    (sum: number, t: number) => sum + Math.pow(t / totalTokens, 2),
    0
  );

  return { token_concentration: concentration };
});

// Example metric: Active member ratio
registerMetric('active_member_ratio', (model) => {
  if (!model.dao || !model.dao.members || model.dao.members.length === 0) {
    return { active_member_ratio: 0 };
  }

  const activeCount = model.dao.members.filter(
    (m: any) => m.lastActiveStep === model.currentStep
  ).length;

  return {
    active_member_ratio: activeCount / model.dao.members.length,
    active_members: activeCount,
  };
});
