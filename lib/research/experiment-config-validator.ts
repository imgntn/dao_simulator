import type { ExperimentConfig } from './experiment-config';
import { METRIC_REGISTRY } from './metric-registry';

export function validateExperimentConfig(config: ExperimentConfig): void {
  const errors: string[] = [];

  if (!config.name?.trim()) errors.push('name must be non-empty');
  if (!Number.isInteger(config.execution?.runsPerConfig) ||
      config.execution.runsPerConfig <= 0) {
    errors.push('execution.runsPerConfig must be a positive integer');
  }
  if (!Number.isInteger(config.execution?.stepsPerRun) ||
      config.execution.stepsPerRun <= 0) {
    errors.push('execution.stepsPerRun must be a positive integer');
  }
  if (
    config.execution.learningEpisodesPerRun !== undefined
    && (
      !Number.isInteger(config.execution.learningEpisodesPerRun)
      || config.execution.learningEpisodesPerRun <= 0
      || config.execution.learningEpisodesPerRun > config.execution.stepsPerRun
    )
  ) {
    errors.push(
      'execution.learningEpisodesPerRun must be a positive integer no greater than stepsPerRun'
    );
  }
  if (!Array.isArray(config.metrics) || config.metrics.length === 0) {
    errors.push('metrics must contain at least one explicit metric');
  }
  if (!config.output?.directory?.trim()) {
    errors.push('output.directory must be non-empty');
  }
  if (
    config.output?.timelineStride !== undefined
    && (!Number.isInteger(config.output.timelineStride) || config.output.timelineStride <= 0)
  ) {
    errors.push('output.timelineStride must be a positive integer');
  }
  if (config.output?.timelineStride !== undefined && !config.output.includeTimeline) {
    errors.push('output.timelineStride requires output.includeTimeline=true');
  }
  if (config.execution.workers !== undefined &&
      (!Number.isInteger(config.execution.workers) || config.execution.workers <= 0)) {
    errors.push('execution.workers must be a positive integer');
  }
  validateResearchLearningIsolation(config, errors);

  const names = new Set<string>();
  for (const [index, metric] of (config.metrics ?? []).entries()) {
    const location = `metrics[${index}]`;
    if (!metric.name?.trim()) errors.push(`${location}.name must be non-empty`);
    if (names.has(metric.name)) errors.push(`${location}.name duplicates "${metric.name}"`);
    names.add(metric.name);

    if (metric.type === 'builtin') {
      if (!metric.builtin) {
        errors.push(`${location}.builtin is required when type is "builtin"`);
      } else if (!(metric.builtin in METRIC_REGISTRY)) {
        errors.push(`${location}.builtin "${metric.builtin}" is not registered`);
      }
      if (metric.expression !== undefined) {
        errors.push(`${location}.expression is not allowed for a builtin metric`);
      }
    } else if (metric.type === 'custom') {
      if (!metric.expression?.trim()) {
        errors.push(`${location}.expression is required when type is "custom"`);
      }
      if (metric.builtin !== undefined) {
        errors.push(`${location}.builtin is not allowed for a custom metric`);
      }
    } else {
      errors.push(
        `${location}.type must explicitly be "builtin" or "custom"; name inference is forbidden`
      );
    }
  }

  if (config.execution.seedStrategy === 'random') {
    errors.push(
      'execution.seedStrategy "random" is prohibited for research runs; use sequential or fixed seeds'
    );
  }
  if (config.execution.seedStrategy === 'sequential' &&
      !Number.isInteger(config.execution.baseSeed)) {
    errors.push('execution.baseSeed must be an integer for sequential seeds');
  }
  if (config.execution.seedStrategy === 'fixed' &&
      (!config.execution.fixedSeeds?.length ||
        config.execution.fixedSeeds.some(seed => !Number.isInteger(seed)))) {
    errors.push('execution.fixedSeeds must contain integers for fixed seeds');
  }
  if (config.execution.seedStrategy === 'fixed' &&
      config.execution.fixedSeeds?.length !== config.execution.runsPerConfig) {
    errors.push('Missing fixed seed: execution.fixedSeeds must contain exactly runsPerConfig seeds');
  }

  const sweep = config.sweep;
  if (sweep) {
    const hasSingle = typeof sweep.parameter === 'string';
    const hasGrid = Array.isArray(sweep.grid);
    if (hasSingle === hasGrid) {
      errors.push('sweep must declare exactly one of parameter or grid');
    }
    if (hasSingle) {
      if (!sweep.parameter?.trim()) errors.push('sweep.parameter must be non-empty');
      const hasValues = Array.isArray(sweep.values);
      const hasRange = sweep.range !== undefined;
      if (hasValues === hasRange) {
        errors.push('single-parameter sweep must declare exactly one of values or range');
      }
      if (hasValues && sweep.values!.length === 0) {
        errors.push('sweep.values must be non-empty');
      }
      if (hasRange) validateRange(sweep.range!, 'sweep.range', errors);
      if (sweep.parameter === 'research_horizon_steps') {
        validateResearchHorizonDimension(
          sweep.values,
          sweep.range,
          'sweep',
          errors
        );
      }
      if (sweep.type === 'zip') {
        errors.push('sweep.type "zip" requires a multi-parameter grid');
      }
    }
    if (hasGrid) {
      if (sweep.grid!.length === 0) errors.push('sweep.grid must be non-empty');
      const parameters = new Set<string>();
      const dimensionLengths: number[] = [];
      sweep.grid!.forEach((dimension, index) => {
        const location = `sweep.grid[${index}]`;
        if (!dimension.parameter?.trim()) {
          errors.push(`${location}.parameter must be non-empty`);
        } else if (parameters.has(dimension.parameter)) {
          errors.push(`${location}.parameter duplicates "${dimension.parameter}"`);
        } else {
          parameters.add(dimension.parameter);
        }
        const hasValues = Array.isArray(dimension.values);
        const hasRange = dimension.range !== undefined;
        if (hasValues === hasRange) {
          errors.push(`${location} must declare exactly one of values or range`);
          return;
        }
        if (hasValues) {
          if (dimension.values!.length === 0) {
            errors.push(`${location}.values must be non-empty`);
          }
          dimensionLengths.push(dimension.values!.length);
        } else {
          dimensionLengths.push(
            validateRange(dimension.range!, `${location}.range`, errors)
          );
        }
        if (dimension.parameter === 'research_horizon_steps') {
          validateResearchHorizonDimension(
            dimension.values,
            dimension.range,
            location,
            errors
          );
        }
      });
      if (
        sweep.type === 'zip'
        && dimensionLengths.length > 1
        && dimensionLengths.some(length => length !== dimensionLengths[0])
      ) {
        errors.push('zip sweep dimensions must have equal lengths');
      }
    }
  }

  if (config.mode === 'city') {
    if (!Array.isArray(config.scenarios) || config.scenarios.length === 0) {
      errors.push('city experiments require at least one scenario');
    } else {
      const scenarioNames = new Set<string>();
      config.scenarios.forEach((scenario, index) => {
        const location = `scenarios[${index}]`;
        if (!scenario.name?.trim()) {
          errors.push(`${location}.name must be non-empty`);
        } else if (scenarioNames.has(scenario.name)) {
          errors.push(`${location}.name duplicates "${scenario.name}"`);
        } else {
          scenarioNames.add(scenario.name);
        }
        if (!Array.isArray(scenario.daos) || scenario.daos.length === 0) {
          errors.push(`${location}.daos must be non-empty`);
          return;
        }
        const daoIds = new Set<string>();
        for (const dao of scenario.daos) {
          if (!dao.id?.trim()) {
            errors.push(`${location} contains a DAO with no stable id`);
          } else if (daoIds.has(dao.id)) {
            errors.push(`${location}.daos duplicates id "${dao.id}"`);
          } else {
            daoIds.add(dao.id);
          }
        }
      });
    }
  } else if (config.scenarios?.length) {
    errors.push('scenarios are only valid when mode is "city"');
  }

  if (config.research) {
    const research = config.research;
    if (!research.publicationRole) {
      errors.push('research.publicationRole must be explicitly declared');
    }
    if (
      research.classification === 'confirmatory'
      && research.publicationRole !== 'core-confirmatory'
    ) {
      errors.push('confirmatory experiments must use publicationRole "core-confirmatory"');
    }
    if (
      research.publicationRole === 'core-confirmatory'
      && research.classification !== 'confirmatory'
    ) {
      errors.push('publicationRole "core-confirmatory" requires confirmatory classification');
    }
    if (
      research.publicationRole === 'pilot-development'
      && research.classification !== 'exploratory'
    ) {
      errors.push('publicationRole "pilot-development" requires exploratory classification');
    }
    if (
      research.publicationRole === 'validation'
      && research.classification !== 'validation'
    ) {
      errors.push('publicationRole "validation" requires validation classification');
    }
    if (
      research.publicationRole === 'legacy-archived'
      && research.classification !== 'legacy'
    ) {
      errors.push('publicationRole "legacy-archived" requires legacy classification');
    }
    if (!research.hypothesis?.trim()) errors.push('research.hypothesis must be non-empty');
    if (!research.researchQuestionIds?.length) {
      errors.push('research.researchQuestionIds must be non-empty');
    }
    if (!research.analysisFamily?.trim()) errors.push('research.analysisFamily must be non-empty');
    if (!research.experimentalUnit?.trim()) errors.push('research.experimentalUnit must be non-empty');
    if (!research.analysisModel) errors.push('research.analysisModel must be declared');
    if (!research.comparisonCorrection) {
      errors.push('research.comparisonCorrection must be declared');
    }
    const builtinMetrics = new Set(
      (config.metrics ?? []).filter(metric => metric.type === 'builtin').map(metric => metric.builtin)
    );
    if (!builtinMetrics.has(research.primaryOutcome)) {
      errors.push(`research.primaryOutcome "${research.primaryOutcome}" is not recorded`);
    }
    const secondary = research.secondaryOutcomes ?? [];
    if (new Set(secondary).size !== secondary.length) {
      errors.push('research.secondaryOutcomes must not contain duplicates');
    }
    for (const outcome of secondary) {
      if (!builtinMetrics.has(outcome)) {
        errors.push(`research.secondaryOutcome "${outcome}" is not recorded`);
      }
      if (outcome === research.primaryOutcome) {
        errors.push('research.primaryOutcome must not also be a secondary outcome');
      }
    }
    if (
      !Number.isFinite(research.smallestEffectOfInterest?.value)
      || research.smallestEffectOfInterest.value <= 0
      || !research.smallestEffectOfInterest.unit?.trim()
      || !research.smallestEffectOfInterest.rationale?.trim()
    ) {
      errors.push('research.smallestEffectOfInterest requires a positive value, unit, and rationale');
    }
    if (research.classification === 'confirmatory' && !config.id?.trim()) {
      errors.push('confirmatory experiments require a stable id');
    }
    if (research.classification === 'confirmatory' && research.comparisonCorrection === 'none') {
      errors.push('confirmatory experiments must declare a multiplicity correction');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid experiment configuration "${config.name || '<unnamed>'}":\n- ${errors.join('\n- ')}`
    );
  }
}

function validateResearchLearningIsolation(
  config: ExperimentConfig,
  errors: string[]
): void {
  const inline = config.baseConfig?.inline;
  const overrides = config.baseConfig?.overrides;
  if (
    inline?.learning_persist_q_tables === true
    || overrides?.learning_persist_q_tables === true
  ) {
    errors.push(
      'learning_persist_q_tables=true is prohibited for research runs because replicates must be independent'
    );
  }
  const persistenceSweeps = [
    ...(config.sweep?.parameter === 'learning_persist_q_tables'
      ? [config.sweep.values ?? []]
      : []),
    ...(config.sweep?.grid ?? [])
      .filter(dimension => dimension.parameter === 'learning_persist_q_tables')
      .map(dimension => dimension.values ?? []),
  ];
  if (persistenceSweeps.some(values => values.includes(true))) {
    errors.push(
      'sweeping learning_persist_q_tables=true is prohibited because replicates must be independent'
    );
  }
}

function validateResearchHorizonDimension(
  values: Array<number | string | boolean> | undefined,
  range: { min: number; max: number; step: number } | undefined,
  location: string,
  errors: string[]
): void {
  if (values) {
    values.forEach((value, index) => {
      if (!Number.isSafeInteger(value) || Number(value) <= 0) {
        errors.push(
          `${location}.values[${index}] for research_horizon_steps must be a positive safe integer`
        );
      }
    });
  }
  if (
    range
    && (
      !Number.isSafeInteger(range.min)
      || !Number.isSafeInteger(range.max)
      || !Number.isSafeInteger(range.step)
      || range.min <= 0
    )
  ) {
    errors.push(
      `${location}.range for research_horizon_steps requires positive safe-integer min, max, and step`
    );
  }
}

function validateRange(
  range: { min: number; max: number; step: number },
  location: string,
  errors: string[]
): number {
  if (
    !Number.isFinite(range?.min)
    || !Number.isFinite(range?.max)
    || !Number.isFinite(range?.step)
    || range.step <= 0
    || range.max < range.min
  ) {
    errors.push(`${location} requires finite min <= max and step > 0`);
    return 0;
  }
  const rawSteps = (range.max - range.min) / range.step;
  const count = Math.floor(rawSteps + 1e-12) + 1;
  if (count > 100_000) {
    errors.push(`${location} expands beyond 100000 conditions`);
  }
  return count;
}
