#!/usr/bin/env npx tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'yaml';
import type {
  BuiltinMetricType,
  ExperimentConfig,
  ResearchDesignMetadata,
} from '../lib/research/experiment-config';
import { validateExperimentConfig } from '../lib/research/experiment-config-validator';

const ROOT = process.cwd();
const PILOT_SEEDS = [920003, 920021, 920039, 920051, 920071, 920083, 920099, 920111];
const FINAL_SEEDS = Array.from({ length: 100 }, (_, index) => 930001 + (index * 37));
export type RobustnessProfile = 'pilot' | 'final';

const METRICS: ExperimentConfig['metrics'] = [
  metric('proposal_completion_rate', 'Proposal Completion Rate'),
  metric('quorum_reach_rate', 'Quorum Reach Rate'),
  metric('voter_participation_rate', 'Voter Participation Rate'),
  metric('proposal_abandonment_rate', 'Proposal Abandonment Rate'),
  metric('governance_activity_index', 'Governance Activity Index'),
  metric('delegate_concentration', 'Delegate Concentration'),
  metric('whale_influence', 'Whale Influence'),
  metric('voter_concentration_gini', 'Voter Concentration Gini'),
  metric('treasury_growth_rate', 'Treasury Growth Rate'),
  metric('treasury_volatility', 'Treasury Volatility'),
  metric('final_token_price', 'Final Token Price'),
  metric('token_price_volatility', 'Token Price Volatility'),
  metric('token_conservation_error', 'Token Conservation Error'),
  metric('total_proposals', 'Total Proposals'),
  metric('learning_agent_count', 'Learning Agent Count'),
  metric('learning_q_table_size_mean', 'Mean Learning Q-Table Size'),
  metric('learning_episode_count_mean', 'Mean Learning Episode Count'),
  metric('learning_exploration_rate_mean', 'Mean Learning Exploration Rate'),
  metric('learning_total_reward_mean', 'Mean Learning Total Reward'),
];

function metric(builtin: BuiltinMetricType, name: string): ExperimentConfig['metrics'][number] {
  return {
    name,
    type: 'builtin',
    builtin,
    description: `Registered ${name.toLowerCase()} estimand`,
  };
}

function baseConfig(): ExperimentConfig['baseConfig'] {
  return {
    template: 'compound',
    population: { totalMembers: 200 },
    overrides: {
      governance_rule: 'majority',
      voting_activity: 0.25,
      proposal_creation_probability: 0.004,
      proposal_duration_min_steps: 24,
      proposal_duration_max_steps: 96,
      treasury_stabilization_enabled: true,
      treasury_target_reserve: 10000,
      treasury_target_reserve_fraction: 0.6,
      treasury_buffer_fraction: 0.2,
      treasury_buffer_fill_rate: 0.5,
      treasury_emergency_topup_rate: 0.25,
      treasury_max_spend_fraction: 0.15,
      participation_target_rate: 0.2,
      participation_boost_strength: 0.6,
      participation_boost_decay: 0.1,
      participation_boost_max: 0.25,
      participation_inactivity_boost: 0.15,
      participation_reward_per_vote: 0,
      proposal_bond_fraction: 0.01,
      proposal_bond_min: 10,
      proposal_bond_max: 1000,
      proposal_inactivity_steps: 72,
      proposal_temp_check_fraction: 0.25,
      proposal_fast_track_min_steps: 6,
      proposal_fast_track_approval: 0.6,
      proposal_fast_track_quorum: 0.2,
      vote_power_cap_fraction: 0.15,
      vote_power_quadratic_threshold: 250,
      vote_power_velocity_window: 72,
      vote_power_velocity_penalty: 0.5,
      delegation_lock_steps: 48,
      forum_enabled: true,
      oracle_type: 'fixed',
      learning_enabled: false,
      treasuryProtocolAnnualYield: 0,
      simulationStepsPerYear: 8760,
    },
  };
}

function research(
  profile: RobustnessProfile,
  question: string,
  hypothesis: string,
  primaryOutcome: BuiltinMetricType,
  secondaryOutcomes: BuiltinMetricType[],
  smallestEffect: number,
  unit: string,
): ResearchDesignMetadata {
  return {
    classification: 'exploratory',
    publicationRole: profile === 'pilot' ? 'pilot-development' : 'supporting-exploratory',
    researchQuestionIds: [question],
    hypothesis,
    primaryOutcome,
    secondaryOutcomes,
    analysisModel: 'paired_contrast',
    comparisonCorrection: 'holm',
    smallestEffectOfInterest: {
      value: smallestEffect,
      unit,
      rationale: 'A change of this magnitude would alter interpretation of the core findings.',
    },
    analysisFamily: 'publication-robustness',
    experimentalUnit: 'One seeded DAO simulation replicate under one robustness condition.',
    estimatedRuntimeMinutes: profile === 'pilot' ? 30 : 240,
  };
}

function common(
  profile: RobustnessProfile,
  id: string,
  name: string,
  description: string,
  researchMetadata: ResearchDesignMetadata,
  sweep: NonNullable<ExperimentConfig['sweep']>,
): ExperimentConfig {
  return {
    id: `${id}-${profile}`,
    name,
    description,
    version: '1.0.0',
    author: 'DAO Simulator Research Framework',
    tags: ['publication', 'robustness', `paired-${profile}`],
    research: researchMetadata,
    baseConfig: baseConfig(),
    sweep,
    execution: {
      runsPerConfig: profile === 'pilot' ? PILOT_SEEDS.length : FINAL_SEEDS.length,
      stepsPerRun: 1000,
      seedStrategy: 'fixed',
      fixedSeeds: [...(profile === 'pilot' ? PILOT_SEEDS : FINAL_SEEDS)],
      workers: 4,
    },
    metrics: METRICS.map((entry) => ({ ...entry })),
    output: {
      directory: `results/robustness-${profile}/${id}-${profile}`,
      formats: ['json', 'csv'],
      includeRawRuns: true,
      includeManifest: true,
      includeTimeline: true,
      timelineStride: 24,
    },
  };
}

export function buildRobustnessConfigs(
  profile: RobustnessProfile,
): Array<{ file: string; config: ExperimentConfig }> {
  const studyLabel = profile === 'pilot' ? 'Pilot' : 'Publication Study';
  const horizon = common(
    profile,
    'robustness-horizon',
    `Research Horizon Sensitivity - Paired ${studyLabel}`,
    'Tests whether core governance estimates are stable across short, medium, and long horizons.',
    research(
      profile,
      'ROBUSTNESS-HORIZON',
      'Core governance estimates remain directionally and practically stable from 500 to 2,000 hourly steps.',
      'proposal_completion_rate',
      ['quorum_reach_rate', 'voter_participation_rate', 'proposal_abandonment_rate'],
      0.05,
      'absolute proportion',
    ),
    { parameter: 'research_horizon_steps', values: [500, 1000, 2000] },
  );

  const yieldSensitivity = common(
    profile,
    'robustness-yield',
    `Treasury Yield Sensitivity - Paired ${studyLabel}`,
    'Separates governance findings from assumptions about passive protocol yield.',
    research(
      profile,
      'ROBUSTNESS-YIELD',
      'Core governance findings are not materially changed by plausible annual protocol yields.',
      'treasury_growth_rate',
      ['treasury_volatility', 'proposal_completion_rate', 'voter_participation_rate'],
      0.05,
      'relative treasury growth',
    ),
    { parameter: 'treasuryProtocolAnnualYield', values: [0, 0.02, 0.05] },
  );

  const learning = common(
    profile,
    'robustness-learning-ablation',
    `Learning-Agent Ablation - Paired ${studyLabel}`,
    'Compares fixed heuristics with within-replicate tabular learning over four episodes.',
    research(
      profile,
      'ROBUSTNESS-LEARNING',
      'Within-replicate learning changes governance activity without creating conservation errors.',
      'governance_activity_index',
      ['proposal_completion_rate', 'voter_participation_rate', 'voter_concentration_gini'],
      0.05,
      'governance activity index',
    ),
    { parameter: 'learning_enabled', values: [false, true] },
  );
  learning.execution.learningEpisodesPerRun = 4;

  const forum = common(
    profile,
    'robustness-forum-ablation',
    `Forum-Layer Ablation - Paired ${studyLabel}`,
    'Measures whether simulated deliberation materially changes the core governance estimands.',
    research(
      profile,
      'ROBUSTNESS-FORUM',
      'Enabling the forum layer changes participation and proposal completion by less than the declared practical threshold.',
      'voter_participation_rate',
      ['proposal_completion_rate', 'quorum_reach_rate', 'governance_activity_index'],
      0.05,
      'absolute proportion',
    ),
    { parameter: 'forum_enabled', values: [false, true] },
  );

  const delegation = common(
    profile,
    'robustness-delegation-depth',
    `Delegation-Depth Sensitivity - Paired ${studyLabel}`,
    'Stress-tests shallow, bounded, and unlimited delegation resolution in a delegation-specialist population.',
    research(
      profile,
      'ROBUSTNESS-DELEGATION',
      'Delegation resolution depth changes whale vote-weight influence more than it changes proposal completion.',
      'whale_influence',
      ['delegate_concentration', 'voter_concentration_gini', 'proposal_completion_rate', 'voter_participation_rate'],
      0.05,
      'absolute vote-weight share',
    ),
    { parameter: 'delegation_max_depth', values: [1, 3, 0] },
  );
  delegation.baseConfig.population = {
    totalMembers: 200,
    distribution: [{ archetype: 'delegate', percentage: 100 }],
  };

  return [
    { file: '01-horizon-sensitivity.yaml', config: horizon },
    { file: '02-yield-sensitivity.yaml', config: yieldSensitivity },
    { file: '03-learning-ablation.yaml', config: learning },
    { file: '04-forum-ablation.yaml', config: forum },
    { file: '05-delegation-depth.yaml', config: delegation },
  ];
}

function atomicWrite(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, contents, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function main(): void {
  const profileIndex = process.argv.indexOf('--profile');
  const requested = profileIndex >= 0 ? process.argv[profileIndex + 1] : 'all';
  if (!requested || !['pilot', 'final', 'all'].includes(requested)) {
    throw new Error('--profile must be pilot, final, or all');
  }
  const profiles: RobustnessProfile[] = requested === 'all'
    ? ['pilot', 'final']
    : [requested as RobustnessProfile];
  for (const profile of profiles) {
    const outputDir = path.join(ROOT, 'experiments', `robustness-${profile}`);
    for (const { file, config } of buildRobustnessConfigs(profile)) {
      validateExperimentConfig(config);
      const target = path.join(outputDir, file);
      atomicWrite(
        target,
        '# Generated by scripts/generate-robustness-configs.ts; regenerate with npm run catalog:robustness.\n'
          + yaml.stringify(config, { lineWidth: 0 }),
      );
      console.log(path.relative(ROOT, target).replace(/\\/g, '/'));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
