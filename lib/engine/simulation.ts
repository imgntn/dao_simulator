// DAOSimulation - Main simulation orchestrator
// Port from dao_simulation.py

import { Model } from './model';
import { RandomActivation, ParallelActivation, AsyncActivation } from './scheduler';
import { SimpleDataCollector } from './data-collector';
import { DAO } from '../data-structures/dao';
import { EventBus } from '../utils/event-bus';
import { NFTMarketplace } from '../data-structures/nft';
import { ReputationTracker } from '../data-structures/reputation';
import { MarketShock } from '../data-structures/market-shock';
import { EventEngine } from '../utils/event-engine';
import { EventLogger, IndexedDBEventLogger } from '../utils/event-logger';
import { AgentManager } from '../utils/agent-manager';
import { settings, SimulationSettings } from '../config/settings';
import type { LearningState } from '../agents/learning/learning-mixin';
import { createRewardAggregator, RewardAggregator } from '../agents/learning/reward-aggregator';
import {
  RewardShaper,
  PotentialContext,
  createGovernanceShaper,
  createFinancialShaper,
  createCommunityShaper,
} from '../agents/learning/reward-shaper';
import * as constants from '../config/constants';
import { getRule, GovernanceRuleConfig, QuadraticVotingRule } from '../utils/governance-plugins';
import { setSeed, resetGlobalRandom, getRandomState, setRandomState, random } from '../utils/random';
import { GovernanceProcessor, createGovernanceProcessor } from '../governance';
import { DelegationResolver } from '../delegation/delegation-resolver';
import {
  RandomWalkOracle,
  GeometricBrownianOracle,
  FixedPriceOracle,
  CalibratedGBMOracle,
  HistoricalReplayOracle,
} from '../utils/oracles';
import { ForumState } from '../data-structures/forum';
import { ForumSimulation } from './forum-simulation';
import { CalibrationLoader } from '../digital-twins/calibration-loader';
import type { CalibrationProfile, VoterCluster } from '../digital-twins/calibration-loader';
import { getGovernanceMapping } from '../digital-twins/governance-mapping';
import { logger } from '../utils/logger';
import {
  Developer,
  Investor,
  Trader,
  AdaptiveInvestor,
  Delegator,
  LiquidDelegator,
  ProposalCreator,
  Validator,
  ServiceProvider,
  Arbitrator,
  Regulator,
  Auditor,
  BountyHunter,
  ExternalPartner,
  PassiveMember,
  Artist,
  Collector,
  Speculator,
  RLTrader,
  GovernanceExpert,
  GovernanceWhale,
  RiskManager,
  MarketMaker,
  Whistleblower,
  StakerAgent,
} from '../agents';
import { DAOMember } from '../agents/base';
import type { DAOModel } from './model';
import { type Proposal, isMultiStageProposal, type MultiStageFields } from '../data-structures/proposal';

// Type for agent constructor classes - uses DAOModel since that's what agents accept
type AgentClass = new (
  uniqueId: string,
  model: DAOModel,
  ...args: unknown[]
) => DAOMember;

/** Structural interface for agents with learning mixin capabilities */
interface LearningCapable {
  learning?: {
    recordReward: (reward: number, state: string, actions: string[]) => void;
    update: (state: string, action: string, reward: number, nextState: string, availableActions: string[]) => void;
    lastState: string | null;
    lastAction: string | null;
    mergeFrom: (other: unknown, weight: number) => void;
    getConfig?: () => { discountFactor?: number };
    getExplorationRate: () => number;
  };
  endEpisode?: () => void;
  exportLearningState?: () => LearningState;
  importLearningState?: (state: LearningState) => void;
  constructor: { name: string; ACTIONS?: string[] };
}

/** Structural interface for agents with delegation budget */
interface DelegationBudgetCapable {
  delegationBudget: number;
  maxDelegationBudget: number;
}

/** Structural interface for governance rules that expose quorum/threshold config */
interface GovernanceRuleQuorumConfig {
  quorumPercentage?: number;
  threshold?: number;
  approvalThreshold?: number;
  constitutionalQuorum?: number;
  nonConstitutionalQuorum?: number;
}

interface AgentConfigEntry {
  class: AgentClass;
  count: number;
  params: Record<string, unknown>;
}

export interface DAOSimulationConfig extends Partial<SimulationSettings> {
  exportCsv?: boolean;
  csvFilename?: string;
  useParallel?: boolean;
  useAsync?: boolean;
  maxWorkers?: number;
  eventLogging?: boolean;
  eventLogFilename?: string;
  useIndexedDB?: boolean;
  checkpointInterval?: number;
  marketShockSchedule?: Record<number, number>;
  eventsFile?: string | any[];
  reportFile?: string;
  seed?: number;
  centralityInterval?: number;
  /** Data collection interval in steps (default 10). Set to 1 for per-step collection (slower). */
  collectionInterval?: number;
  useSharedRandom?: boolean;
  // Governance rule configuration (quorum percentage, thresholds, etc.)
  governance_config?: GovernanceRuleConfig;
  // Calibration and forum (also available via SimulationSettings)
  oracle_type?: 'random_walk' | 'gbm' | 'calibrated_gbm' | 'historical_replay' | 'fixed';
  oracle_calibration_dao_id?: string;
  forum_enabled?: boolean;
  forum_influence_weight?: number;
  calibration_dao_id?: string;
  calibration_strict_replay?: boolean;
}

export class DAOSimulation extends Model {
  dao: DAO;
  eventBus: EventBus;
  exportCsv: boolean;
  csvFilename: string;
  useParallel: boolean;
  useAsync: boolean;
  maxWorkers?: number;
  eventLogging: boolean;
  eventLogFilename: string;
  useIndexedDB: boolean;
  checkpointInterval: number;
  marketShockSchedule: Record<number, number>;
  reportFile?: string;
  seed?: number;

  // Simulation settings
  tokenEmissionRate: number;
  tokenBurnRate: number;
  stakingInterestRate: number;
  slashFraction: number;
  reputationDecayRate: number;
  marketShockFrequency: number;
  adaptiveLearningRate: number;
  adaptiveEpsilon: number;
  priceVolatility: number;
  governanceRuleName: string;
  governanceRule: any;
  totalEmergencyTopup: number;
  private emergencyTopupTotal: number = 0;
  private readonly EMERGENCY_TOPUP_LIFETIME_CAP = 500000;

  // Policy state
  private treasuryEma: number = 0;
  private votersThisStep: Set<string> = new Set();

  // Agent counts
  numDevelopers: number;
  numInvestors: number;
  numTraders: number;
  numAdaptiveInvestors: number;
  numDelegators: number;
  numLiquidDelegators: number;
  numProposalCreators: number;
  numValidators: number;
  numServiceProviders: number;
  numArbitrators: number;
  numRegulators: number;
  numAuditors: number;
  numBountyHunters: number;
  numExternalPartners: number;
  numPassiveMembers: number;
  numArtists: number;
  numCollectors: number;
  numSpeculators: number;
  numStakers: number;
  numRLTraders: number;
  numGovernanceExperts: number;
  numGovernanceWhales: number;
  numRiskManagers: number;
  numMarketMakers: number;
  numWhistleblowers: number;

  // Probabilities and parameters
  commentProbability: number;
  proposalCreationProbability: number;
  proposalDurationSteps: number;
  proposalDurationMinSteps: number;
  proposalDurationMaxSteps: number;
  externalPartnerInteractProbability: number;
  violationProbability: number;
  reputationPenalty: number;

  // Components
  eventLogger: EventLogger | IndexedDBEventLogger | null = null;
  marketplace: NFTMarketplace;
  reputationTracker: ReputationTracker;
  dataCollector: SimpleDataCollector;
  agentManager: AgentManager;
  eventEngine?: EventEngine;
  currentShock: number = 0;
  governanceProcessor: GovernanceProcessor | null = null;
  /** RewardAggregators for learning agents, keyed by agent uniqueId */
  rewardAggregators: Map<string, RewardAggregator> = new Map();
  /** RewardShapers for learning agents with delayed rewards, keyed by agent uniqueId */
  rewardShapers: Map<string, RewardShaper> = new Map();
  /** Forum simulation module */
  forumSimulation: ForumSimulation | null = null;
  forumState: ForumState | null = null;
  /** Calibration profile for this simulation */
  calibrationProfile: CalibrationProfile | null = null;
  /** Whether to use real governance rules for calibrated simulations */
  useRealGovernance: boolean = false;

  constructor(config: DAOSimulationConfig = {}) {
    super();

    // Create DAO
    this.dao = new DAO(
      'MyDAO',
      config.violation_probability ?? settings.violation_probability,
      config.reputation_penalty ?? settings.reputation_penalty,
      config.comment_probability ?? settings.comment_probability,
      config.voting_activity ?? settings.voting_activity,
      config.external_partner_interact_probability ?? settings.external_partner_interact_probability,
      config.staking_interest_rate ?? settings.staking_interest_rate,
      config.slash_fraction ?? settings.slash_fraction,
      config.reputation_decay_rate ?? settings.reputation_decay_rate
    );

    // Use the DAO's event bus
    this.eventBus = this.dao.eventBus;

    // Clear caches to avoid cross-simulation contamination
    DelegationResolver.clearCache();
    DAOMember.clearMemberLookupCache();

    // CRITICAL: Reset global random state before setting seed
    // This ensures each simulation starts fresh and is reproducible
    // Without this, state from previous simulations persists
    const useSharedRandom = config.useSharedRandom ?? false;
    if (!useSharedRandom) {
      if (config.seed !== undefined) {
        this.seed = config.seed;
        // Reset and set seed for deterministic runs
        resetGlobalRandom(config.seed);
      } else {
        // No seed provided - use timestamp but still reset to clear old state
        resetGlobalRandom();
        this.seed = undefined;
      }
    } else {
      // City simulations share a single RNG seeded at the run level
      this.seed = config.seed;
    }

    // Configuration
    this.exportCsv = config.exportCsv ?? false;
    this.csvFilename = config.csvFilename ?? 'simulation_data.csv';
    this.useParallel = config.useParallel ?? false;
    this.useAsync = config.useAsync ?? false;
    this.maxWorkers = config.maxWorkers;
    this.eventLogging = config.eventLogging ?? false;
    this.eventLogFilename = config.eventLogFilename ?? 'events.csv';
    this.useIndexedDB = config.useIndexedDB ?? true;
    this.checkpointInterval = config.checkpointInterval ?? 0;
    this.marketShockSchedule = config.marketShockSchedule ?? {};
    this.reportFile = config.reportFile;

    // Settings
    this.tokenEmissionRate = config.token_emission_rate ?? settings.token_emission_rate;
    this.tokenBurnRate = config.token_burn_rate ?? settings.token_burn_rate;
    this.stakingInterestRate = config.staking_interest_rate ?? settings.staking_interest_rate;
    this.slashFraction = config.slash_fraction ?? settings.slash_fraction;
    this.reputationDecayRate = config.reputation_decay_rate ?? settings.reputation_decay_rate;
    this.marketShockFrequency = config.market_shock_frequency ?? settings.market_shock_frequency;
    this.adaptiveLearningRate = config.adaptive_learning_rate ?? settings.adaptive_learning_rate;
    this.adaptiveEpsilon = config.adaptive_epsilon ?? settings.adaptive_epsilon;
    this.priceVolatility = config.price_volatility ?? settings.price_volatility;

    // Governance
    this.governanceRuleName = config.governance_rule ?? settings.governance_rule;
    // Pass governance config to rule (quorum percentage, thresholds, etc.)
    const rule = getRule(this.governanceRuleName, config.governance_config);
    if (!rule) {
      throw new Error(`Unknown governance rule: ${this.governanceRuleName}`);
    }
    this.governanceRule = rule;
    this.dao.governanceRuleName = this.governanceRuleName;
    this.useRealGovernance = config.calibration_use_real_governance ?? settings.calibration_use_real_governance;
    this.totalEmergencyTopup = 0;

    // Agent counts
    this.numDevelopers = config.num_developers ?? settings.num_developers;
    this.numInvestors = config.num_investors ?? settings.num_investors;
    this.numTraders = config.num_traders ?? settings.num_traders;
    this.numAdaptiveInvestors = config.num_adaptive_investors ?? settings.num_adaptive_investors;
    this.numDelegators = config.num_delegators ?? settings.num_delegators;
    this.numLiquidDelegators = config.num_liquid_delegators ?? settings.num_liquid_delegators;
    this.numProposalCreators = config.num_proposal_creators ?? settings.num_proposal_creators;
    this.numValidators = config.num_validators ?? settings.num_validators;
    this.numServiceProviders = config.num_service_providers ?? settings.num_service_providers;
    this.numArbitrators = config.num_arbitrators ?? settings.num_arbitrators;
    this.numRegulators = config.num_regulators ?? settings.num_regulators;
    this.numAuditors = config.num_auditors ?? settings.num_auditors;
    this.numBountyHunters = config.num_bounty_hunters ?? settings.num_bounty_hunters;
    this.numExternalPartners = config.num_external_partners ?? settings.num_external_partners;
    this.numPassiveMembers = config.num_passive_members ?? settings.num_passive_members;
    this.numArtists = config.num_artists ?? settings.num_artists;
    this.numCollectors = config.num_collectors ?? settings.num_collectors;
    this.numSpeculators = config.num_speculators ?? settings.num_speculators;
    this.numStakers = config.num_stakers ?? settings.num_stakers;
    this.numRLTraders = config.num_rl_traders ?? settings.num_rl_traders;
    this.numGovernanceExperts = config.num_governance_experts ?? settings.num_governance_experts;
    this.numGovernanceWhales = config.num_governance_whales ?? settings.num_governance_whales;
    this.numRiskManagers = config.num_risk_managers ?? settings.num_risk_managers;
    this.numMarketMakers = config.num_market_makers ?? settings.num_market_makers;
    this.numWhistleblowers = config.num_whistleblowers ?? settings.num_whistleblowers;

    // Probabilities
    this.commentProbability = config.comment_probability ?? settings.comment_probability;
    this.proposalCreationProbability = config.proposal_creation_probability ?? settings.proposal_creation_probability;
    this.proposalDurationSteps = config.proposal_duration_steps ?? settings.proposal_duration_steps;
    this.proposalDurationMinSteps = config.proposal_duration_min_steps ?? settings.proposal_duration_min_steps;
    this.proposalDurationMaxSteps = config.proposal_duration_max_steps ?? settings.proposal_duration_max_steps;
    this.externalPartnerInteractProbability = config.external_partner_interact_probability ?? settings.external_partner_interact_probability;
    this.violationProbability = config.violation_probability ?? settings.violation_probability;
    this.reputationPenalty = config.reputation_penalty ?? settings.reputation_penalty;

    // Policy configuration
    this.dao.treasuryPolicy = {
      enabled: config.treasury_stabilization_enabled ?? settings.treasury_stabilization_enabled,
      targetReserve: config.treasury_target_reserve ?? settings.treasury_target_reserve,
      targetReserveFraction: config.treasury_target_reserve_fraction ?? settings.treasury_target_reserve_fraction,
      emaAlpha: config.treasury_ema_alpha ?? settings.treasury_ema_alpha,
      bufferFraction: config.treasury_buffer_fraction ?? settings.treasury_buffer_fraction,
      bufferFillRate: config.treasury_buffer_fill_rate ?? settings.treasury_buffer_fill_rate,
      emergencyTopupRate: config.treasury_emergency_topup_rate ?? settings.treasury_emergency_topup_rate,
      maxSpendFraction: config.treasury_max_spend_fraction ?? settings.treasury_max_spend_fraction,
    };
    this.dao.proposalPolicy = {
      bondFraction: config.proposal_bond_fraction ?? settings.proposal_bond_fraction,
      bondMin: config.proposal_bond_min ?? settings.proposal_bond_min,
      bondMax: config.proposal_bond_max ?? settings.proposal_bond_max,
      inactivitySteps: config.proposal_inactivity_steps ?? settings.proposal_inactivity_steps,
      tempCheckFraction: config.proposal_temp_check_fraction ?? settings.proposal_temp_check_fraction,
      fastTrackMinSteps: config.proposal_fast_track_min_steps ?? settings.proposal_fast_track_min_steps,
      fastTrackApproval: config.proposal_fast_track_approval ?? settings.proposal_fast_track_approval,
      fastTrackQuorum: config.proposal_fast_track_quorum ?? settings.proposal_fast_track_quorum,
      durationMinSteps: config.proposal_duration_min_steps ?? settings.proposal_duration_min_steps,
      durationMaxSteps: config.proposal_duration_max_steps ?? settings.proposal_duration_max_steps,
    };
    this.dao.participationPolicy = {
      targetRate: config.participation_target_rate ?? settings.participation_target_rate,
      boostStrength: config.participation_boost_strength ?? settings.participation_boost_strength,
      boostDecay: config.participation_boost_decay ?? settings.participation_boost_decay,
      boostMax: config.participation_boost_max ?? settings.participation_boost_max,
      inactivityBoost: config.participation_inactivity_boost ?? settings.participation_inactivity_boost,
      rewardPerVote: config.participation_reward_per_vote ?? settings.participation_reward_per_vote,
    };
    this.dao.votingPowerPolicy = {
      capFraction: config.vote_power_cap_fraction ?? settings.vote_power_cap_fraction,
      quadraticThreshold: config.vote_power_quadratic_threshold ?? settings.vote_power_quadratic_threshold,
      velocityWindow: config.vote_power_velocity_window ?? settings.vote_power_velocity_window,
      velocityPenalty: config.vote_power_velocity_penalty ?? settings.vote_power_velocity_penalty,
    };
    this.dao.delegationLockSteps = config.delegation_lock_steps ?? settings.delegation_lock_steps;

    // Configure enhanced delegation parameters
    DelegationResolver.maxDepth = config.delegation_max_depth ?? settings.delegation_max_depth;
    DelegationResolver.decayPerHop = config.delegation_decay_per_hop ?? settings.delegation_decay_per_hop;

    // Initialize event logger
    if (this.eventLogging) {
      if (this.useIndexedDB && typeof window !== 'undefined') {
        this.eventLogger = new IndexedDBEventLogger('dao-simulation-events');
      } else {
        this.eventLogger = new EventLogger();
      }

      // Subscribe to all events
      this.eventBus.subscribe('*', (data: any) => {
        this.eventLogger!.handleEvent(data.event, data);
      });
    }

    // Track per-step voting participation
    this.eventBus.subscribe('vote_cast', (data: any) => {
      if (typeof data?.member === 'string') {
        this.votersThisStep.add(data.member);
      }
    });

    // Initialize marketplace
    this.marketplace = new NFTMarketplace(this.eventBus);
    this.dao.marketplace = this.marketplace;

    // Load calibration profile if configured
    const calibrationDaoId = config.calibration_dao_id ?? settings.calibration_dao_id;
    if (calibrationDaoId) {
      this.calibrationProfile = CalibrationLoader.load(calibrationDaoId);
      if (this.calibrationProfile) {
        // Apply calibrated settings
        const calibratedSettings = CalibrationLoader.toSettings(this.calibrationProfile);
        Object.assign(this, {
          priceVolatility: calibratedSettings.price_volatility ?? this.priceVolatility,
          commentProbability: calibratedSettings.comment_probability ?? this.commentProbability,
          proposalCreationProbability: calibratedSettings.proposal_creation_probability ?? this.proposalCreationProbability,
        });
        if (calibratedSettings.voting_activity !== undefined) {
          this.dao.votingActivity = calibratedSettings.voting_activity;
        }
        // Apply temp_check_fraction from calibration (0 for calibrated sims — with
        // only ~2-3 voters per proposal, multi-stage temp_check adds noise)
        if (calibratedSettings.proposal_temp_check_fraction !== undefined) {
          this.dao.proposalPolicy.tempCheckFraction = calibratedSettings.proposal_temp_check_fraction;
        }

        // When using real governance, re-initialize the governance rule from the mapping
        // (unless user explicitly set a rule via governance_rule or governance_config)
        if (this.useRealGovernance && !config.governance_rule && !config.governance_config) {
          const mapping = getGovernanceMapping(calibrationDaoId);
          if (mapping) {
            const realRule = getRule(mapping.ruleName, mapping.ruleConfig);
            if (realRule) {
              this.governanceRuleName = mapping.ruleName;
              this.governanceRule = realRule;
              this.dao.governanceRuleName = mapping.ruleName;
            }
          }
        }

        // Apply calibration-aware governance tuning.
        // Always apply when calibration_dao_id is set — the calibration pipeline
        // overrides governance parameters (quorum=0, optimism bias) to match
        // historical DAO behavior at simulation scale.
        this.applyCalibrationGovernanceTuning(this.calibrationProfile);

        // Calibrate participation policy to match historical activity level
        // Without this, the default targetRate (25%) overwhelms low votingActivity values (3%)
        // via the participation boost mechanism
        if (calibratedSettings.voting_activity !== undefined) {
          this.dao.participationPolicy.targetRate = calibratedSettings.voting_activity;
          // Scale boost max proportionally — prevent boost from exceeding calibrated rate
          this.dao.participationPolicy.boostMax = Math.min(
            calibratedSettings.voting_activity * 0.5,
            this.dao.participationPolicy.boostMax
          );
        }

        // Calibrate proposal duration from historical voting period
        if (this.calibrationProfile.proposals.avg_voting_period_days > 0) {
          const calibratedDuration = Math.round(
            this.calibrationProfile.proposals.avg_voting_period_days * 24
          );
          this.proposalDurationSteps = calibratedDuration;
          this.proposalDurationMinSteps = Math.max(24, Math.round(calibratedDuration * 0.5));
          this.proposalDurationMaxSteps = Math.round(calibratedDuration * 2);
          this.dao.proposalPolicy.durationMinSteps = this.proposalDurationMinSteps;
          this.dao.proposalPolicy.durationMaxSteps = this.proposalDurationMaxSteps;
        }
      }
    }

    // Initialize oracle based on configuration
    const oracleType = config.oracle_type ?? settings.oracle_type;
    this.initializeOracle(oracleType, calibrationDaoId);

    // Initialize treasury with funding
    const initialFunding = constants.INITIAL_TREASURY_FUNDING;
    this.dao.treasury.deposit('DAO_TOKEN', initialFunding, this.currentStep);

    // Initialize forum simulation if enabled
    const forumEnabled = config.forum_enabled ?? settings.forum_enabled;
    if (forumEnabled) {
      this.forumState = new ForumState();
      this.forumSimulation = new ForumSimulation(
        this.forumState,
        this.calibrationProfile,
        config.forum_influence_weight ?? settings.forum_influence_weight
      );
    }

    // Initialize reputation tracker
    this.reputationTracker = new ReputationTracker(this.dao, this.reputationDecayRate);

    // Load market shocks
    if (Object.keys(this.marketShockSchedule).length > 0) {
      for (const [stepStr, severity] of Object.entries(this.marketShockSchedule)) {
        const step = parseInt(stepStr);
        const shock = new MarketShock(step, severity);
        this.dao.marketShocks.push(shock);
      }
    }

    // Initialize data collector
    this.dataCollector = new SimpleDataCollector(
      this.dao,
      config.centralityInterval ?? 1,
      config.collectionInterval ?? 10
    );
    if (this.forumState) {
      this.dataCollector.setForumState(this.forumState);
    }

    // Initialize agent manager
    this.agentManager = new AgentManager(this);

    // Initialize scheduler
    if (this.useAsync) {
      this.schedule = new AsyncActivation();
    } else if (this.useParallel) {
      this.schedule = new ParallelActivation(this.maxWorkers);
    } else {
      this.schedule = new RandomActivation();
    }

    // Initialize event engine
    if (config.eventsFile) {
      if (Array.isArray(config.eventsFile)) {
        this.eventEngine = new EventEngine(config.eventsFile);
      } else if (typeof config.eventsFile === 'string') {
        // Load from JSON string
        this.eventEngine = new EventEngine();
        this.eventEngine.loadFromJson(config.eventsFile);
      }
    }

    // Create agents
    this.initializeAgents();

    // Apply calibration-based agent adjustments (must happen AFTER agents are created)
    if (this.calibrationProfile) {
      this.applyCalibrationAgentTuning(this.calibrationProfile);
    }

    // Override global learning_enabled if config explicitly sets it
    if (config.learning_enabled !== undefined) {
      settings.learning_enabled = config.learning_enabled;
    }

    // Wire RewardAggregators for all learning-enabled agents
    if (settings.learning_enabled) {
      this.wireRewardAggregators();
    }

    // Initialize governance processor for multi-stage proposals, timelocks, etc.
    this.governanceProcessor = createGovernanceProcessor(
      this.dao,
      this.eventBus,
      'default'  // Can be overridden via setGovernanceType
    );
  }

  /**
   * Set the governance type for the processor
   */
  setGovernanceType(daoType: string): void {
    this.governanceProcessor = createGovernanceProcessor(
      this.dao,
      this.eventBus,
      daoType
    );
  }

  /**
   * Apply governance parameter tuning from calibration profile.
   * Uses historical quorum hit rate and participation to derive realistic thresholds.
   *
   * Derives quorum from `voting.avg_participation_rate` (expected range 0-1) and
   * approval threshold from `voting.avg_for_percentage` (expected range 0-1).
   * Values outside expected ranges are clamped with a warning.
   */
  private applyCalibrationGovernanceTuning(profile: CalibrationProfile): void {
    if (this.useRealGovernance) {
      // Real governance: rule already set by constructor via CalibrationLoader.toSettings()
      // Tune parameters from the calibration profile data
      this.tuneGovernanceFromProfile(profile);
      return;
    }

    // Legacy path: quorum=0, optimism-hacked pass rate
    const voting = profile.voting;

    // Validate input ranges
    if (voting.avg_participation_rate > 1) {
      logger.warn(`Calibration: avg_participation_rate=${voting.avg_participation_rate} exceeds expected range [0,1], clamping`);
    }
    if (voting.avg_for_percentage > 1) {
      logger.warn(`Calibration: avg_for_percentage=${voting.avg_for_percentage} exceeds expected range [0,1], clamping`);
    }

    // Disable quorum for calibrated sims. Real DAOs compute quorum over thousands of
    // token holders; with only ~74 agents and compressed token distribution (alpha=0.8),
    // a single non-whale voter may hold < 0.1% of supply, making any token-weighted
    // quorum unrealistic. The MajorityRule just checks votesFor > votesAgainst.
    // Pass/fail rate is then governed by the calibrated voting probabilities and
    // optimism bias, not by an artificial quorum threshold.
    //
    // NOTE: We must reconstruct the governance rule here — GovernanceRule subclasses
    // store quorumPercentage as a private field, so setting it via type cast only
    // creates a new public property that the class never reads.
    const zeroQuorumRule = getRule(this.governanceRuleName, {
      quorumPercentage: 0,
      threshold: 0,
      // Zero out all quorum variants for rule subtypes (CategoryQuorum, etc.)
      constitutionalQuorum: 0,
      nonConstitutionalQuorum: 0,
      approvalThreshold: 0.5,
    });
    if (zeroQuorumRule) {
      this.governanceRule = zeroQuorumRule;
    }

    // Disable inactivity timeout for calibrated sims. With calibrated voting
    // probabilities, all votes land in the first few steps. After that, the
    // proposal has no new activity — and any positive inactivity timeout would
    // expire proposals WITH valid votes before the voting period ends.
    this.dao.proposalPolicy.inactivitySteps = 0;

  }

  /**
   * Tune governance rule parameters from historical calibration data.
   * Used when calibration_use_real_governance is true.
   *
   * Instead of forcing quorum=0 and hacking optimism, this configures
   * the real governance rule's parameters to produce emergent pass rates.
   */
  private tuneGovernanceFromProfile(profile: CalibrationProfile): void {
    const mapping = getGovernanceMapping(profile.dao_id);
    if (!mapping) return;

    const voting = profile.voting;

    // Disable inactivity timeout for calibrated sims (same as legacy path).
    this.dao.proposalPolicy.inactivitySteps = 0;

    // Set quorum=0 for all calibrated simulations. Token-weighted quorum is
    // fundamentally unrealistic at simulation scale (~200 agents vs thousands
    // of real token holders). Real DAOs' quorum hit rates depend on a handful
    // of mega-whales whose voting power concentration can't be faithfully
    // reproduced at small population sizes. Instead, pass/fail is governed by
    // calibrated voting probabilities and optimism bias, which are tuned to
    // match historical pass rates. The quorum check becomes non-binding.
    //
    // NOTE: We must reconstruct the governance rule — all GovernanceRule subclasses
    // store fields as private, so setting them via type cast only creates shadow
    // public properties that the class methods never read.
    const forPct = Math.min(voting.avg_for_percentage, 1);
    const derivedThreshold = forPct > 0 ? Math.max(0.5, Math.min(0.9, forPct * 0.8)) : 0.5;

    // Reconstruct the CURRENT rule (not the mapping's rule) with zero-quorum config.
    // This respects explicit user overrides (e.g. governance_rule: 'quadratic')
    // while still disabling quorum for calibration.
    const ruleConfig: GovernanceRuleConfig = {
      quorumPercentage: 0,
      constitutionalQuorum: 0,
      nonConstitutionalQuorum: 0,
      threshold: derivedThreshold,
      approvalThreshold: derivedThreshold,
    };

    const newRule = getRule(this.governanceRuleName, ruleConfig);
    if (newRule) {
      this.governanceRule = newRule;
    }
  }

  /**
   * Apply agent-level calibration tuning from the calibration profile.
   * Must be called AFTER agents are created (initializeAgents).
   *
   * - Biases agent optimism toward historical approval rates
   * - Applies voter-cluster token distribution for realistic Gini
   */
  private applyCalibrationAgentTuning(profile: CalibrationProfile): void {
    const voting = profile.voting;

    // Pass-rate-aware optimism blending (shared by real governance and legacy paths)
    const passRate = profile.proposals.pass_rate;
    const forPct = Math.min(voting.avg_for_percentage, 1);
    let target: number;
    if (passRate >= 0.8) {
      // High pass rate DAOs: strong optimism push.
      // Use the HIGHER of for_percentage and a pass-rate-derived target.
      // DAOs like Lido have forPct=0.65 but pass_rate=0.9963 — the moderate
      // for_percentage reflects vote margins, but nearly all proposals pass
      // because whales consistently vote YES. With token-weighted majority
      // in a concentrated sim, a single whale NO can flip results, so we need
      // high optimism to reproduce near-100% pass rates.
      const passTarget = 0.5 + passRate * 0.45; // 0.9963 → 0.948
      target = Math.max(Math.min(forPct, 1), passTarget);
    } else if (passRate >= 0.5) {
      // Medium pass rate: blend toward neutral
      const blend = (passRate - 0.5) / 0.3; // 0 at passRate=0.5, 1 at passRate=0.8
      target = 0.5 + (forPct - 0.5) * blend * 0.85;
    } else {
      // Low pass rate (<0.5): meaningfully below 0.5 so more proposals fail
      // e.g. Nouns (passRate=0.45) → target=0.435 instead of old 0.498
      target = 0.3 + passRate * 0.3;
    }
    for (const member of this.dao.members) {
      const spread = (member.optimism - 0.5) * 0.1; // ±5% noise
      member.optimism = Math.max(0, Math.min(1, target + spread));
    }

    // Distribute opposition bias for low-pass DAOs.
    // Agents in low-pass DAOs get a structural NO tendency proportional to
    // how far below 1.0 the pass rate is. For Nouns (0.45), ~40% of agents
    // get oppositionBias in [0.3, 0.6], creating genuine opposition blocks.
    if (passRate < 0.8) {
      const oppositionStrength = 1 - passRate; // 0.55 for Nouns, 0.2 for 80% pass DAO
      const members = this.dao.members;
      for (let i = 0; i < members.length; i++) {
        // Assign opposition to a fraction of agents proportional to opposition strength
        const agentFraction = i / members.length;
        if (agentFraction < oppositionStrength) {
          // Scale from 0.6 (strongest opponents) down to 0.1 (mild opponents)
          const biasScale = 1 - (agentFraction / oppositionStrength);
          members[i].oppositionBias = 0.1 + biasScale * 0.5; // Range [0.1, 0.6]
        } else {
          members[i].oppositionBias = 0;
        }
      }
    }

    // Disable inactivity boost for calibrated sims — it inflates participation
    // above the historically calibrated voting_activity level
    this.dao.participationPolicy.inactivityBoost = 0;

    // In calibrated mode, only ProposalCreator agents create proposals.
    // Investor (0.001/step) and GovernanceWhale (0.002/step) are suppressed to prevent
    // overshooting — with 5 Investors, their combined 0.005/step = 3.6 proposals/month,
    // which already exceeds targets for low-activity DAOs (ENS: 2.15/mo, Curve: 3.5/mo).
    this.dao.calibratedProposals = true;

    // Apply voter-cluster token distribution for realistic concentration
    if (profile.voter_clusters && profile.voter_clusters.length > 0) {
      this.applyCalibrationTokenDistribution(profile.voter_clusters);
      this.applyCalibrationVotingProbabilities(profile.voter_clusters, voting.avg_participation_rate);
    }
  }

  /**
   * Assign per-agent voting probabilities from voter cluster participation rates.
   *
   * Real DAOs have heterogeneous voting: whales/delegates vote on most proposals
   * (~50-60% participation), while passive holders rarely vote (~1-2%).
   * This ensures most proposals reach quorum (whale votes) while keeping
   * overall head-count participation low.
   *
   * The cluster rates are scaled so the overall expected voters per proposal
   * matches the historical avg_participation_rate * totalMembers, with a floor
   * of lambda=2.0 to ensure reliable quorum.
   */
  // Agent types that never call voteOnRandomProposal() in their step() method
  private static readonly NON_VOTING_TYPES = new Set(['ExternalPartner', 'AdaptiveInvestor']);

  private applyCalibrationVotingProbabilities(
    clusters: VoterCluster[],
    avgParticipationRate: number
  ): void {
    if (clusters.length === 0 || avgParticipationRate <= 0) return;

    const totalMembers = this.dao.members.length;
    if (totalMembers === 0) return;

    // Count agents that actually call voteOnRandomProposal()
    const votingAgentCount = this.dao.members.filter(
      m => !DAOSimulation.NON_VOTING_TYPES.has(m.constructor.name)
    ).length;

    // Sort clusters by avg_voting_power descending (same order as token distribution)
    const sorted = [...clusters].sort((a, b) => b.avg_voting_power - a.avg_voting_power);

    // Compute the unscaled expected voters per proposal from cluster rates
    let unscaledLambda = 0;
    let memberIdx = 0;
    const clusterRates: number[] = [];
    for (let ci = 0; ci < sorted.length; ci++) {
      const cluster = sorted[ci];
      const clusterSize = Math.max(1, Math.round(cluster.share * totalMembers));
      for (let i = 0; i < clusterSize && memberIdx < totalMembers; i++, memberIdx++) {
        clusterRates.push(cluster.participation_rate);
        unscaledLambda += cluster.participation_rate;
      }
    }
    // Fill remaining agents with the last cluster's rate
    while (clusterRates.length < totalMembers) {
      const lastRate = sorted[sorted.length - 1].participation_rate;
      clusterRates.push(lastRate);
      unscaledLambda += lastRate;
    }

    // Target lambda = avgParticipationRate * totalMembers (expected votes per proposal)
    // Scale up by totalMembers/votingAgentCount since non-voting agents waste their probability
    // Floor of 1.0 prevents division-by-zero; low-participation DAOs (compound: 1.75%)
    // genuinely have many proposals with 0 voters, matching their quorum_hit_rate < 100%
    const rawLambda = avgParticipationRate * totalMembers;
    const votingRatio = votingAgentCount > 0 ? totalMembers / votingAgentCount : 1;
    const targetLambda = Math.max(1.0, rawLambda * votingRatio);
    const scaleFactor = unscaledLambda > 0 ? targetLambda / unscaledLambda : 1;

    // Apply scaled probabilities to agents
    for (let i = 0; i < totalMembers; i++) {
      const scaledProb = Math.min(0.95, clusterRates[i] * scaleFactor);
      this.dao.members[i].calibratedVotingProbability = scaledProb;
    }
  }

  /**
   * Distribute tokens across agents based on voter cluster data from calibration.
   * Uses power-law compression (ratio^alpha) to produce a high Gini coefficient
   * while keeping the max single-agent share ≤ ~30% of supply.
   *
   * Raw voting power spans 5+ orders of magnitude (e.g. 1e25 whale vs 1e20 regular).
   * With alpha=0.3, a 90,000x raw ratio becomes ~30x, giving Gini ~0.4
   * and the top agent ~25-30% of supply (enough for quorum to still function).
   */
  private applyCalibrationTokenDistribution(clusters: VoterCluster[]): void {
    if (clusters.length === 0) return;

    // Sort clusters by avg_voting_power descending (whales first)
    const sorted = [...clusters].sort((a, b) => b.avg_voting_power - a.avg_voting_power);

    const totalMembers = this.dao.members.length;
    const totalCurrentTokens = this.dao.members.reduce((s, m) => s + m.tokens, 0);
    if (totalCurrentTokens <= 0) return;

    // Use power-law compression: ratio^alpha
    // Higher alpha preserves more inequality for realistic Gini (target ~0.99).
    // alpha=0.9 produces Gini ~0.93 (vs ~0.85 with alpha=0.8).
    // With 72 agents, max achievable Gini is ~0.986 (1 - 1/n).
    const ALPHA = 0.9;
    const minPower = Math.max(1e-30, Math.min(...sorted.map(c => c.avg_voting_power)));
    const compressedWeights = sorted.map(c => {
      const ratio = Math.max(1, c.avg_voting_power / minPower);
      return Math.pow(ratio, ALPHA);
    });

    // Build per-agent token assignments based on cluster sizes
    const assignments: number[] = [];
    for (let ci = 0; ci < sorted.length; ci++) {
      const cluster = sorted[ci];
      const clusterSize = Math.max(1, Math.round(cluster.share * totalMembers));
      for (let i = 0; i < clusterSize && assignments.length < totalMembers; i++) {
        assignments.push(compressedWeights[ci]);
      }
    }
    // Fill remaining with lowest cluster weight
    while (assignments.length < totalMembers) {
      assignments.push(compressedWeights[compressedWeights.length - 1]);
    }

    // Normalize to preserve total token supply
    const totalWeight = assignments.reduce((s, w) => s + w, 0);
    if (totalWeight <= 0) return;

    for (let i = 0; i < totalMembers; i++) {
      this.dao.members[i].tokens = (assignments[i] / totalWeight) * totalCurrentTokens;
    }
  }

  /**
   * Initialize the price oracle based on configuration.
   *
   * Supported oracle types:
   * - `'random_walk'` (default) — simple random walk from Treasury constructor
   * - `'gbm'` — Geometric Brownian Motion with fixed drift=0.01, vol=0.2
   * - `'calibrated_gbm'` — GBM calibrated from CalibrationProfile market data (drift, volatility, drawdown events)
   * - `'historical_replay'` — replays price CSV data, falls back to calibrated GBM when data ends
   * - `'fixed'` — price never changes
   *
   * Invalid types log a warning and fall back to `'random_walk'`.
   */
  private initializeOracle(oracleType: string, calibrationDaoId?: string): void {
    const validTypes = ['random_walk', 'gbm', 'calibrated_gbm', 'historical_replay', 'fixed'];
    if (!validTypes.includes(oracleType)) {
      logger.warn(`Unknown oracle_type "${oracleType}", falling back to "random_walk". Valid types: ${validTypes.join(', ')}`);
      oracleType = 'random_walk';
    }

    const profile = this.calibrationProfile;

    switch (oracleType) {
      case 'gbm':
        this.dao.treasury.oracle = new GeometricBrownianOracle(0.01, 0.2);
        break;

      case 'calibrated_gbm':
        if (profile?.market) {
          this.dao.treasury.oracle = new CalibratedGBMOracle({
            drift: profile.market.avg_daily_return / 24, // per-step drift
            volatility: profile.market.daily_volatility / Math.sqrt(24),
            initialPrice: profile.market.avg_price_usd,
            drawdownEvents: profile.market.drawdown_events?.map(dd => ({
              startStep: dd.start_idx * 24, // Convert day index to step
              endStep: dd.end_idx * 24,
              magnitude: dd.magnitude,
            })),
            // Stronger mean-reversion to counteract treasury selling pressure.
            // Default 0.01 gives ~24% equilibrium deviation; 0.03 reduces it to ~8%.
            meanReversionSpeed: 0.03,
          });
          this.dao.treasury.oracle.setPrice('DAO_TOKEN', profile.market.avg_price_usd);
          this.dao.treasury.updateTokenPrice('DAO_TOKEN', profile.market.avg_price_usd);
        } else {
          this.dao.treasury.oracle = new GeometricBrownianOracle(0.01, 0.2);
        }
        break;

      case 'historical_replay': {
        const timeSeries = this.loadMarketTimeSeries(calibrationDaoId);
        if (timeSeries.length > 0 && profile?.market) {
          this.dao.treasury.oracle = new HistoricalReplayOracle(
            timeSeries,
            {
              drift: profile.market.avg_daily_return / 24,
              volatility: profile.market.daily_volatility / Math.sqrt(24),
            }
          );
          this.dao.treasury.oracle.setPrice('DAO_TOKEN', timeSeries[0].price);
          this.dao.treasury.updateTokenPrice('DAO_TOKEN', timeSeries[0].price);
        } else if (profile?.market) {
          // Fallback to calibrated GBM if no CSV data
          this.dao.treasury.oracle = new CalibratedGBMOracle({
            drift: profile.market.avg_daily_return / 24,
            volatility: profile.market.daily_volatility / Math.sqrt(24),
            initialPrice: profile.market.avg_price_usd,
          });
          this.dao.treasury.oracle.setPrice('DAO_TOKEN', profile.market.avg_price_usd);
          this.dao.treasury.updateTokenPrice('DAO_TOKEN', profile.market.avg_price_usd);
        }
        break;
      }

      case 'fixed':
        this.dao.treasury.oracle = new FixedPriceOracle();
        break;

      case 'random_walk':
      default:
        // Keep default RandomWalkOracle from Treasury constructor
        break;
    }
  }

  /**
   * Load market price time series from CSV for a given DAO.
   * Returns array of {step, price} entries. Each day maps to 24 steps.
   */
  private loadMarketTimeSeries(daoId?: string): Array<{ step: number; price: number }> {
    if (!daoId) return [];

    try {
      const fs = require('fs');
      const path = require('path');
      const csvPath = path.resolve(__dirname, '../../results/historical/market/market_daily.csv');
      if (!fs.existsSync(csvPath)) return [];

      const content: string = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');
      if (lines.length < 2) return [];

      // Parse header to find column indices
      const header = lines[0].split(',').map((h: string) => h.trim());
      const daoIdIdx = header.indexOf('dao_id');
      const priceIdx = header.indexOf('price_usd');
      const timestampIdx = header.indexOf('timestamp_utc');

      if (daoIdIdx < 0 || priceIdx < 0) return [];

      // Filter rows for this DAO, sort by timestamp
      const rows: Array<{ timestamp: number; price: number }> = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length <= Math.max(daoIdIdx, priceIdx)) continue;
        if (cols[daoIdIdx].trim() !== daoId) continue;

        const price = parseFloat(cols[priceIdx].trim());
        const timestamp = timestampIdx >= 0 ? parseInt(cols[timestampIdx].trim()) : i;
        if (!isFinite(price) || price <= 0) continue;

        rows.push({ timestamp, price });
      }

      rows.sort((a, b) => a.timestamp - b.timestamp);

      // Convert daily entries to step-indexed: each day = 24 steps
      return rows.map((row, dayIndex) => ({
        step: dayIndex * 24,
        price: row.price,
      }));
    } catch (error) {
      logger.warn(`Failed to load market time series for "${daoId}"`, error);
      return [];
    }
  }

  /**
   * Initialize all agents based on configuration
   */
  private initializeAgents(): void {
    const agentConfigs: AgentConfigEntry[] = [
      { class: Developer as AgentClass, count: this.numDevelopers, params: {} },
      { class: Investor as AgentClass, count: this.numInvestors, params: { investmentBudget: constants.INVESTOR_BUDGET } },
      { class: Trader as AgentClass, count: this.numTraders, params: {} },
      { class: AdaptiveInvestor as AgentClass, count: this.numAdaptiveInvestors, params: { investmentBudget: constants.ADAPTIVE_INVESTOR_BUDGET, learningRate: this.adaptiveLearningRate, epsilon: this.adaptiveEpsilon } },
      { class: Delegator as AgentClass, count: this.numDelegators, params: { delegationBudget: constants.DELEGATOR_BUDGET } },
      { class: LiquidDelegator as AgentClass, count: this.numLiquidDelegators, params: { delegationBudget: constants.LIQUID_DELEGATOR_BUDGET } },
      { class: ProposalCreator as AgentClass, count: this.numProposalCreators, params: {} },
      { class: Validator as AgentClass, count: this.numValidators, params: {} },
      { class: ServiceProvider as AgentClass, count: this.numServiceProviders, params: { serviceBudget: constants.SERVICE_PROVIDER_BUDGET } },
      { class: Arbitrator as AgentClass, count: this.numArbitrators, params: { arbitrationCapacity: constants.ARBITRATOR_CAPACITY } },
      { class: Regulator as AgentClass, count: this.numRegulators, params: {} },
      { class: Auditor as AgentClass, count: this.numAuditors, params: {} },
      { class: BountyHunter as AgentClass, count: this.numBountyHunters, params: {} },
      { class: ExternalPartner as AgentClass, count: this.numExternalPartners, params: {} },
      { class: PassiveMember as AgentClass, count: this.numPassiveMembers, params: {} },
      { class: Artist as AgentClass, count: this.numArtists, params: {} },
      { class: Collector as AgentClass, count: this.numCollectors, params: {} },
      { class: Speculator as AgentClass, count: this.numSpeculators, params: {} },
      { class: StakerAgent as AgentClass, count: this.numStakers, params: {} },
      { class: RLTrader as AgentClass, count: this.numRLTraders, params: { learningRate: this.adaptiveLearningRate, epsilon: this.adaptiveEpsilon } },
      { class: GovernanceExpert as AgentClass, count: this.numGovernanceExperts, params: {} },
      { class: GovernanceWhale as AgentClass, count: this.numGovernanceWhales, params: {} },
      { class: RiskManager as AgentClass, count: this.numRiskManagers, params: {} },
      { class: MarketMaker as AgentClass, count: this.numMarketMakers, params: {} },
      { class: Whistleblower as AgentClass, count: this.numWhistleblowers, params: {} },
    ];

    for (const config of agentConfigs) {
      for (let i = 0; i < config.count; i++) {
        const agent = this.agentManager.createAgent(
          config.class,
          `${config.class.name}_${i}`,
          config.params
        );
        this.dao.addMember(agent);
        this.schedule.add(agent);
      }
    }
  }

  /**
   * Build a PotentialContext for a given agent at the current simulation state.
   */
  private buildPotentialContext(member: DAOMember): PotentialContext {
    const openProposalCount = this.dao.proposals.filter(p => p.status === 'open').length;
    const totalProposals = this.dao.proposals.length;
    // Participation rate: fraction of proposals this agent voted on
    const votedCount = member.votes?.size ?? 0;
    const participationRate = totalProposals > 0 ? votedCount / totalProposals : 0;

    return {
      tokens: member.tokens,
      stakedTokens: member.stakedTokens,
      reputation: member.reputation,
      treasuryFunds: this.dao.treasury.funds,
      treasuryTarget: this.dao.treasuryPolicy.targetReserve,
      tokenPrice: this.dao.treasury.getTokenPrice('DAO_TOKEN'),
      memberCount: this.dao.members.length,
      openProposalCount,
      participationRate,
      step: this.currentStep,
    };
  }

  /**
   * Distribute aggregated rewards and shaping rewards to learning agents.
   * This supplements each agent's inline reward computation with:
   * 1. Event-driven signals (RewardAggregator)
   * 2. Potential-based reward shaping (RewardShaper) for denser feedback
   */
  private distributeAggregatedRewards(): void {
    for (const member of this.dao.members) {
      const agent = member as unknown as LearningCapable;
      if (!agent.learning || typeof agent.learning.recordReward !== 'function') continue;

      // Collect event-based reward
      const aggregator = this.rewardAggregators.get(member.uniqueId);
      let eventReward = 0;
      if (aggregator) {
        eventReward = aggregator.collectAndClear(member.uniqueId, this.currentStep);
      }

      // Compute shaping reward
      const shaper = this.rewardShapers.get(member.uniqueId);
      let shapingReward = 0;
      if (shaper) {
        const ctx = this.buildPotentialContext(member);
        shapingReward = shaper.step(ctx);
      }

      // Combine: event rewards (0.3 weight) + shaping rewards (0.2 weight)
      const totalSupplementalReward = eventReward * 0.3 + shapingReward * 0.2;
      if (totalSupplementalReward === 0) continue;

      // If the agent has a current state tracked, apply the reward
      if (agent.learning.lastState !== null && agent.learning.lastAction !== null) {
        const actions = agent.constructor.ACTIONS
          ? [...agent.constructor.ACTIONS]
          : [];

        if (actions.length > 0) {
          agent.learning.recordReward(
            totalSupplementalReward,
            agent.learning.lastState,
            actions
          );
        }
      }
    }
  }

  /**
   * Wire RewardAggregators and RewardShapers for all learning-enabled agents.
   * Each agent gets its own aggregator that subscribes to relevant events
   * on the DAO event bus and collects reward signals.
   * Agents with delayed rewards also get a RewardShaper for potential-based guidance.
   */
  private wireRewardAggregators(): void {
    // Agent type categories for reward shaper assignment
    const governanceTypes = new Set([
      'GovernanceExpert', 'Delegator', 'LiquidDelegator', 'Regulator',
      'GovernanceWhale', 'ProposalCreator', 'Arbitrator',
    ]);
    const financialTypes = new Set([
      'RLTrader', 'MarketMaker', 'Speculator', 'Trader', 'Investor',
      'AdaptiveInvestor', 'RiskManager', 'StakerAgent',
    ]);
    const communityTypes = new Set([
      'Developer', 'ServiceProvider', 'BountyHunter', 'Artist',
      'Collector', 'Whistleblower', 'Auditor', 'Validator',
    ]);

    for (const member of this.dao.members) {
      const agent = member as unknown as LearningCapable;
      // Only wire for agents with a learning mixin
      if (!agent.learning || typeof agent.learning.update !== 'function') continue;

      const typeName = member.constructor.name;

      // Wire reward aggregator
      const aggregator = createRewardAggregator(typeName);
      aggregator.subscribeToEvents(this.eventBus, member.uniqueId);
      this.rewardAggregators.set(member.uniqueId, aggregator);

      // Wire reward shaper based on agent category
      const gamma = agent.learning.getConfig?.()?.discountFactor ?? 0.95;
      let shaper: RewardShaper | null = null;

      if (governanceTypes.has(typeName)) {
        shaper = createGovernanceShaper(gamma);
      } else if (financialTypes.has(typeName)) {
        shaper = createFinancialShaper(gamma);
      } else if (communityTypes.has(typeName)) {
        shaper = createCommunityShaper(gamma);
      }

      if (shaper) {
        this.rewardShapers.set(member.uniqueId, shaper);
      }
    }
  }

  /**
   * Trigger a market shock
   */
  triggerMarketShock(severity: number): void {
    const oldPrice = this.dao.treasury.getTokenPrice('DAO_TOKEN');
    const newPrice = Math.max(constants.MIN_TOKEN_PRICE, oldPrice * (1 + severity));

    this.dao.treasury.updateTokenPrice('DAO_TOKEN', newPrice);
    this.currentShock = severity;
    this.dao.currentShock = severity;

    this.eventBus.publish('market_shock', {
      step: this.currentStep,
      severity,
      oldPrice,
      newPrice,
    });
  }

  /**
   * Resolve basic proposals whose voting period has ended
   * Applies governance rules to determine pass/fail
   */
  /**
   * Update member reputation based on voting outcomes
   * Members who vote with the winning side gain reputation
   * Members who vote against lose a smaller amount
   * This models the real-world effect of building credibility through
   * consistent, community-aligned voting behavior
   */
  private updateReputationFromVoting(proposal: Proposal, approved: boolean): void {
    const REPUTATION_GAIN = 1;   // Gain for voting with majority
    const REPUTATION_LOSS = 0.5; // Loss for voting against (smaller to encourage participation)

    const memberMap = new Map(this.dao.members.map(m => [m.uniqueId, m]));

    for (const [memberId, voteData] of proposal.votes.entries()) {
      const member = memberMap.get(memberId);
      if (!member) continue;

      const votedYes = voteData.vote;
      const votedWithWinner = (votedYes && approved) || (!votedYes && !approved);

      if (votedWithWinner) {
        member.reputation += REPUTATION_GAIN;
      } else {
        // Smaller penalty to encourage participation
        member.reputation = Math.max(0, member.reputation - REPUTATION_LOSS);
      }
    }

    this.eventBus.publish('reputation_updated_from_voting', {
      step: this.currentStep,
      proposalId: proposal.uniqueId,
      outcome: approved ? 'approved' : 'rejected',
      votersUpdated: proposal.votes.size,
    });
  }

  resolveBasicProposals(): void {
    const openProposals = this.dao.proposals.filter(p => p.status === 'open');
    const inactivitySteps = this.dao.proposalPolicy.inactivitySteps;

    for (const proposal of openProposals) {
      const isMultiStage = isMultiStageProposal(proposal);
      const inVotingStage = !isMultiStage || proposal.isInVotingStage;

      // Auto-expire inactive proposals (no votes/comments/delegations)
      if (
        inactivitySteps > 0 &&
        inVotingStage &&
        this.currentStep - proposal.lastActivityStep > inactivitySteps
      ) {
        proposal.status = 'expired';
        proposal.resolvedTime = this.currentStep;
        proposal.quorumMet = false;
        this.eventBus.publish('proposal_expired', {
          step: this.currentStep,
          proposalId: proposal.uniqueId,
          title: proposal.title,
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst,
          participationRate: 0,
          requiredQuorum: (this.governanceRule as unknown as GovernanceRuleQuorumConfig).quorumPercentage ?? 0,
          reason: 'inactivity',
        });
        this.settleProposalBond(proposal, false, 'inactivity');
        // Return delegated support to delegators
        if (proposal.delegatedSupport) {
          for (const [delegatorId, amount] of proposal.delegatedSupport) {
            if (amount > 0) {
              const member = this.dao.members.find(m => m.uniqueId === delegatorId);
              if (member) {
                member.tokens += amount;
                if ('delegationBudget' in member && 'maxDelegationBudget' in member) {
                  const delegator = member as unknown as DelegationBudgetCapable;
                  delegator.delegationBudget = Math.min(
                    delegator.delegationBudget + amount,
                    delegator.maxDelegationBudget
                  );
                }
              }
            }
          }
          proposal.delegatedSupport.clear();
        }
        continue;
      }

      // Skip multi-stage proposals (handled by governance processor)
      if (isMultiStage) {
        continue;
      }

      // Check if voting period has ended
      const votingEnded =
        this.currentStep > proposal.creationTime + proposal.votingPeriod ||
        this.shouldFastTrackProposal(proposal);

      if (!votingEnded) continue;

      // Record the resolution time
      proposal.resolvedTime = this.currentStep;

      // Check quorum FIRST before applying governance rule
      // This ensures proposals that fail quorum are marked as 'expired', not 'rejected'
      // Skip pre-check for QuadraticVotingRule — it uses sqrt'd weights and handles its own quorum
      const isQuadraticRule = this.governanceRule instanceof QuadraticVotingRule;
      const quorumConfig = (this.governanceRule as unknown as GovernanceRuleQuorumConfig).quorumPercentage;
      if (!isQuadraticRule && quorumConfig !== undefined && quorumConfig > 0) {
        // Use snapshot total supply if available for consistency with snapshot-based voting weights.
        // Falls back to live supply for proposals without snapshots (backwards compatibility).
        const totalTokens = (proposal.snapshotTaken && proposal.totalSupplySnapshot > 0)
          ? proposal.totalSupplySnapshot
          : this.dao.members.reduce(
              (sum, member) => sum + member.tokens + member.stakedTokens,
              0
            );
        const votingTokens = proposal.votesFor + proposal.votesAgainst;
        const participationRate = votingTokens / Math.max(totalTokens, 1);
        proposal.quorumMet = participationRate >= quorumConfig;

        if (!proposal.quorumMet) {
          // Quorum not met - mark as expired (abandoned)
          proposal.status = 'expired';
          this.eventBus.publish('proposal_expired', {
            step: this.currentStep,
            proposalId: proposal.uniqueId,
            title: proposal.title,
            votesFor: proposal.votesFor,
            votesAgainst: proposal.votesAgainst,
            participationRate,
            requiredQuorum: quorumConfig,
            reason: 'quorum_not_met',
          });
          this.settleProposalBond(proposal, false, 'quorum_not_met');
          // Return delegated support to delegators
          if (proposal.delegatedSupport) {
            for (const [delegatorId, amount] of proposal.delegatedSupport) {
              if (amount > 0) {
                const member = this.dao.members.find(m => m.uniqueId === delegatorId);
                if (member) {
                  member.tokens += amount;
                  if ('delegationBudget' in member && 'maxDelegationBudget' in member) {
                    const delegator = member as unknown as DelegationBudgetCapable;
                    delegator.delegationBudget = Math.min(
                      delegator.delegationBudget + amount,
                      delegator.maxDelegationBudget
                    );
                  }
                }
              }
            }
            proposal.delegatedSupport.clear();
          }
          continue; // Skip to next proposal
        }
      } else if (isQuadraticRule) {
        // Let QuadraticVotingRule handle its own quorum check
        proposal.quorumMet = true;
      } else {
        proposal.quorumMet = true;
      }

      // Proposals with 0 voters expire — nobody actively voted, so it's abandoned, not rejected.
      // This is universally correct: real DAOs treat unvoted proposals as expired/abandoned.
      if (proposal.votesFor + proposal.votesAgainst === 0) {
        proposal.status = 'expired';
        proposal.quorumMet = false;
        this.eventBus.publish('proposal_expired', {
          step: this.currentStep,
          proposalId: proposal.uniqueId,
          title: proposal.title,
          votesFor: 0,
          votesAgainst: 0,
          participationRate: 0,
          requiredQuorum: 0,
          reason: 'no_votes',
        });
        this.settleProposalBond(proposal, false, 'no_votes');
        continue;
      }

      // Apply governance rule to determine outcome (quorum already met if we get here)
      const approved = this.governanceRule.approve(proposal, this.dao);

      if (approved) {
        proposal.status = 'approved';
        this.eventBus.publish('proposal_approved', {
          step: this.currentStep,
          proposalId: proposal.uniqueId,
          title: proposal.title,
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst,
        });
      } else {
        proposal.status = 'rejected';
        this.eventBus.publish('proposal_rejected', {
          step: this.currentStep,
          proposalId: proposal.uniqueId,
          title: proposal.title,
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst,
        });
      }

      this.settleProposalBond(proposal, true, approved ? 'approved' : 'rejected');

      // Return delegated support to delegators
      if (proposal.delegatedSupport) {
        for (const [delegatorId, amount] of proposal.delegatedSupport) {
          if (amount > 0) {
            const member = this.dao.members.find(m => m.uniqueId === delegatorId);
            if (member) {
              member.tokens += amount;
              // Restore delegation budget if member is a Delegator
              if ('delegationBudget' in member && 'maxDelegationBudget' in member) {
                const delegator = member as unknown as DelegationBudgetCapable;
                delegator.delegationBudget = Math.min(
                  delegator.delegationBudget + amount,
                  delegator.maxDelegationBudget
                );
              }
            }
          }
        }
        proposal.delegatedSupport.clear();
      }

      // Update reputation based on voting outcomes
      this.updateReputationFromVoting(proposal, approved);
    }
  }

  private shouldFastTrackProposal(proposal: Proposal): boolean {
    const policy = this.dao.proposalPolicy;
    if (policy.fastTrackMinSteps <= 0) return false;

    const elapsed = this.currentStep - proposal.creationTime;
    if (elapsed < policy.fastTrackMinSteps) return false;

    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes <= 0) return false;

    const approval = proposal.votesFor / Math.max(totalVotes, 1);
    const totalVotingPower = this.dao.getTotalVotingPower();
    const participation = totalVotes / Math.max(totalVotingPower, 1);

    return approval >= policy.fastTrackApproval && participation >= policy.fastTrackQuorum;
  }

  private settleProposalBond(proposal: Proposal, refundEligible: boolean, reason: string): void {
    if (proposal.bondAmount <= 0 || proposal.bondRefunded || proposal.bondSlashed) {
      return;
    }

    const creator = this.dao.members.find(m => m.uniqueId === proposal.creator);
    if (refundEligible && proposal.quorumMet && creator) {
      const token = this.dao.getPrimaryTokenSymbol();
      const refundable = Math.min(
        proposal.bondAmount,
        this.dao.treasury.getTokenBalance(token)
      );
      if (refundable > 0) {
        this.dao.treasury.withdraw(token, refundable, this.currentStep);
        creator.tokens += refundable;
      }
      proposal.bondRefunded = true;
      this.eventBus.publish('proposal_bond_refunded', {
        step: this.currentStep,
        proposalId: proposal.uniqueId,
        creator: proposal.creator,
        amount: refundable,
        reason,
      });
      return;
    }

    proposal.bondSlashed = true;
    this.eventBus.publish('proposal_bond_slashed', {
      step: this.currentStep,
      proposalId: proposal.uniqueId,
      creator: proposal.creator,
      amount: proposal.bondAmount,
      reason,
    });
  }

  /**
   * Perform treasury buybacks if conditions are met
   */
  performBuybacks(): void {
    const treasury = this.dao.treasury;
    const token = this.dao.getPrimaryTokenSymbol();
    const price = treasury.getTokenPrice(token);
    const funds = treasury.funds;

    const policy = this.dao.treasuryPolicy;
    const minReserve = policy.enabled
      ? policy.targetReserve
      : constants.MIN_TREASURY_RESERVE;
    const available = Math.max(0, funds - minReserve);
    const maxSpend = policy.enabled
      ? available * policy.maxSpendFraction
      : funds * constants.BUYBACK_PERCENTAGE;

    if (
      funds >= constants.BUYBACK_FUND_THRESHOLD &&
      price < constants.BUYBACK_PRICE_THRESHOLD &&
      available > 0
    ) {
      const buybackAmount = Math.min(funds * constants.BUYBACK_PERCENTAGE, maxSpend);

      const burned = treasury.burnTokens(token, buybackAmount, this.currentStep);

      this.eventBus.publish('buyback_executed', {
        step: this.currentStep,
        amount: buybackAmount,
        burned,
        price,
      });
    }
  }

  private applyTreasuryPolicy(): void {
    const policy = this.dao.treasuryPolicy;
    if (!policy.enabled) return;

    const token = this.dao.getPrimaryTokenSymbol();
    const funds = this.dao.treasury.getTokenBalance(token);

    if (this.treasuryEma <= 0) {
      this.treasuryEma = funds;
    }
    this.treasuryEma =
      policy.emaAlpha * funds + (1 - policy.emaAlpha) * this.treasuryEma;

    const targetReserve = Math.max(
      policy.targetReserve,
      this.treasuryEma * policy.targetReserveFraction
    );
    const bufferTarget = targetReserve * policy.bufferFraction;

    const excess = funds - (targetReserve + bufferTarget);
    if (excess > 0) {
      const moved = excess * policy.bufferFillRate;
      if (moved > 0) {
        this.dao.treasury.withdraw(token, moved, this.currentStep);
        this.dao.treasury.deposit('DAO_BUFFER', moved, this.currentStep);
        this.dao.treasuryBuffer = this.dao.treasury.getTokenBalance('DAO_BUFFER');
        this.eventBus.publish('treasury_buffer_filled', {
          step: this.currentStep,
          amount: moved,
          buffer: this.dao.treasuryBuffer,
          targetReserve,
        });
      }
    }

    const shortfall = targetReserve - funds;
    const bufferAvailable = this.dao.treasury.getTokenBalance('DAO_BUFFER');
    if (shortfall > 0 && bufferAvailable > 0) {
      const draw = Math.min(shortfall, bufferAvailable);
      this.dao.treasury.withdraw('DAO_BUFFER', draw, this.currentStep);
      this.dao.treasury.deposit(token, draw, this.currentStep);
      this.dao.treasuryBuffer = this.dao.treasury.getTokenBalance('DAO_BUFFER');
      this.eventBus.publish('treasury_buffer_released', {
        step: this.currentStep,
        amount: draw,
        buffer: this.dao.treasuryBuffer,
        targetReserve,
      });
    }

    if (settings.treasuryEmergencyTopupEnabled && shortfall > 0 && bufferAvailable <= 0 && policy.emergencyTopupRate > 0) {
      let topup = shortfall * policy.emergencyTopupRate;
      // Apply lifetime cap
      const remaining = this.EMERGENCY_TOPUP_LIFETIME_CAP - this.emergencyTopupTotal;
      if (remaining <= 0) {
        topup = 0;
      } else if (topup > remaining) {
        topup = remaining;
      }
      if (topup > 0) {
        this.dao.treasury.mintTokens(token, topup, this.currentStep);
        this.emergencyTopupTotal += topup;
        this.totalEmergencyTopup = (this.totalEmergencyTopup || 0) + topup;
        this.eventBus.publish('treasury_emergency_topup', {
          step: this.currentStep,
          amount: topup,
          totalTopup: this.totalEmergencyTopup,
          lifetimeTopup: this.emergencyTopupTotal,
          lifetimeCap: this.EMERGENCY_TOPUP_LIFETIME_CAP,
          targetReserve,
        });
      }
    }
  }

  private applyParticipationPolicy(): void {
    const policy = this.dao.participationPolicy;
    if (policy.targetRate <= 0) return;

    const memberCount = this.dao.members.length || 1;
    const participationRate = this.votersThisStep.size / memberCount;

    if (participationRate < policy.targetRate) {
      const gap = policy.targetRate - participationRate;
      const boost = Math.min(policy.boostMax, gap * policy.boostStrength);
      this.dao.participationBoost = Math.min(
        policy.boostMax,
        this.dao.participationBoost + boost
      );

      if (policy.rewardPerVote > 0 && this.votersThisStep.size > 0) {
        const token = this.dao.getPrimaryTokenSymbol();
        const totalReward = policy.rewardPerVote * this.votersThisStep.size;
        const available = this.dao.treasury.getTokenBalance(token);
        const payout = Math.min(totalReward, available);
        const perVoter = payout / this.votersThisStep.size;

        if (payout > 0) {
          this.dao.treasury.withdraw(token, payout, this.currentStep);
          for (const voterId of this.votersThisStep) {
            const member = this.dao.members.find(m => m.uniqueId === voterId);
            if (member) {
              member.tokens += perVoter;
            }
          }
        }
      }
    }

    if (policy.boostDecay > 0) {
      this.dao.participationBoost = Math.max(
        0,
        this.dao.participationBoost * (1 - policy.boostDecay)
      );
    }

    this.eventBus.publish('participation_boost_updated', {
      step: this.currentStep,
      participationRate,
      boost: this.dao.participationBoost,
      voters: this.votersThisStep.size,
    });
  }

  private updateTokenVelocityForMembers(): void {
    if (this.dao.votingPowerPolicy.velocityWindow <= 0) return;
    for (const member of this.dao.members) {
      member.updateTokenVelocity(this.currentStep);
    }
  }

  /**
   * Step the simulation forward
   * Note: When using async schedulers (ParallelActivation, AsyncActivation),
   * this method MUST be awaited to ensure agents complete their steps.
   */
  async step(): Promise<void> {
    // CRITICAL: Sync DAO's currentStep with simulation's currentStep at START of step
    // This ensures governance rules that use dao.currentStep see the correct value
    this.dao.currentStep = this.currentStep;

    // Clear per-step caches at step boundaries for consistent calculations
    // DelegationResolver memoizes voting power calculations within a step
    DelegationResolver.setCurrentStep(this.currentStep, this.dao.daoId);
    this.votersThisStep.clear();

    // Process scheduled events
    if (this.eventEngine) {
      this.eventEngine.triggerEvents(this.currentStep, this);
    }

    // Check for scheduled market shocks
    if (this.marketShockSchedule[this.currentStep]) {
      this.triggerMarketShock(this.marketShockSchedule[this.currentStep]);
    }

    // Random market shocks
    if (this.marketShockFrequency > 0 && random() < 1 / this.marketShockFrequency) {
      const severity = (random() - 0.5) * constants.MARKET_SHOCK_RANGE;
      this.triggerMarketShock(severity);
    }

    // Token emission
    if (this.tokenEmissionRate > 0) {
      this.dao.treasury.mintTokens('DAO_TOKEN', this.tokenEmissionRate, this.currentStep);
    }

    // Token burning (capped to available balance)
    if (this.tokenBurnRate > 0) {
      const available = this.dao.treasury.getTokenBalance('DAO_TOKEN');
      const burnAmount = Math.min(this.tokenBurnRate, available);
      if (burnAmount > 0) {
        this.dao.treasury.withdraw('DAO_TOKEN', burnAmount, this.currentStep);
      }
    }

    // Staking rewards (annual APY converted to per-step rate in DAO)
    this.dao.applyStakingInterest();

    // Treasury revenue mechanisms - sustainable DAO economics
    // Real DAOs generate revenue from: protocol fees, staking, grants, services
    // Revenue is proportional to treasury size (like protocol TVL yield) plus
    // fixed operational fees. This balances proposal spending (~2-3% per approval)
    // to produce realistic treasury trajectories instead of monotonic depletion.

    // 1. Protocol activity fees: Fee per active proposal (governance participation cost)
    const activeProposals = this.dao.proposals.filter(p => p.status === 'open').length;
    const proposalFees = activeProposals * settings.treasuryProposalFee;

    // 2. Staking protocol yield: Treasury earns portion of staking rewards
    const totalStaked = this.dao.members.reduce((sum, m) => sum + m.stakedTokens, 0);
    const treasuryStakingYield = totalStaked * settings.treasuryStakingYield;

    // 3. Membership/protocol fees: Base revenue from DAO operations
    const memberActivityFee = this.dao.members.length * settings.treasuryMemberFee;

    // 4. Transaction fees: Revenue from token transfers and trades
    const transactionFees = this.dao.members.length * settings.treasuryTransactionFee;

    // 5. Protocol yield on treasury (TVL-proportional): Real DeFi protocols earn
    // yield on their treasury assets (lending, LP positions, etc.)
    // ~0.05% per step ≈ ~18% annualized at 360 steps/year, realistic for DeFi
    const treasuryFunds = this.dao.treasury.funds;
    const protocolYield = treasuryFunds * 0.0005;

    const totalRevenue = proposalFees + treasuryStakingYield + memberActivityFee + transactionFees + protocolYield;
    if (totalRevenue > 0) {
      this.dao.treasury.mintTokens('DAO_TOKEN', totalRevenue, this.currentStep);

      // Emit revenue event for tracking
      this.eventBus.publish('treasury_revenue', {
        step: this.currentStep,
        source: 'emission',
        proposalFees,
        stakingYield: treasuryStakingYield,
        memberFees: memberActivityFee,
        transactionFees,
        total: totalRevenue,
      });
    }

    // Apply treasury stabilization policy before agent actions
    this.applyTreasuryPolicy();

    // Forum simulation step (before agent actions so sentiment is available)
    if (this.forumSimulation) {
      const agentIds = this.dao.members.map(m => m.uniqueId);
      const openProposalIds = this.dao.proposals
        .filter(p => p.status === 'open')
        .map(p => p.uniqueId);
      this.forumSimulation.step(agentIds, this.currentStep, openProposalIds);
    }

    // Step agents - await to handle async schedulers
    const result = this.schedule.step();
    if (result instanceof Promise) {
      await result;
    }

    // Agent lifecycle management
    this.agentManager.addNewMembers();
    this.agentManager.cullMembers();

    this.applyParticipationPolicy();
    this.updateTokenVelocityForMembers();

    // Reputation decay
    this.reputationTracker.decayReputation();

    // Resolve basic proposals whose voting period has ended
    this.resolveBasicProposals();

    // Process governance systems (timelocks, multi-stage proposals, etc.)
    if (this.governanceProcessor) {
      this.governanceProcessor.processStep(this.currentStep);
    }

    // Update token prices with market dynamics
    this.dao.treasury.updatePrices(this.currentStep, this.priceVolatility);

    // Treasury buybacks
    this.performBuybacks();

    // Process pending removals from this step
    this.dao.processPendingRemovals();

    // Sync scheduler with removed members
    for (const member of this.dao.lastRemovedMembers) {
      this.schedule.remove(member);
    }

    // Distribute aggregated rewards from event bus to learning agents
    if (settings.learning_enabled && this.rewardAggregators.size > 0) {
      this.distributeAggregatedRewards();
    }

    // Collect data
    this.dataCollector.collect(this.dao);

    // Update step counter
    const completedStep = this.currentStep;
    this.currentStep++;
    this.dao.currentStep = this.currentStep;

    // Emit step_end event with the step that just completed
    this.eventBus.publish('step_end', { step: completedStep });

    // Checkpoint if needed
    if (this.checkpointInterval > 0 && this.currentStep % this.checkpointInterval === 0) {
      await this.saveCheckpoint();
    }
  }

  /**
   * Run simulation for multiple steps
   */
  async run(steps: number): Promise<void> {
    for (let i = 0; i < steps; i++) {
      await this.step();
    }
  }

  /**
   * Save checkpoint
   */
  async saveCheckpoint(): Promise<string> {
    const { checkpointManager } = await import('../utils/checkpoint');
    const checkpointId = await checkpointManager.saveCheckpoint(this);

    this.eventBus.publish('checkpoint_saved', {
      step: this.currentStep,
      checkpointId,
    });

    return checkpointId;
  }

  /**
   * Load checkpoint and restore state
   * IMPORTANT: This restores full simulation state including RNG for deterministic replay
   */
  async loadCheckpoint(checkpointId: string): Promise<boolean> {
    const { checkpointManager } = await import('../utils/checkpoint');
    const checkpoint = await checkpointManager.loadCheckpoint(checkpointId);

    if (!checkpoint) {
      return false;
    }

    // Restore simulation step
    this.currentStep = checkpoint.step;

    // Restore DAO step
    this.dao.currentStep = checkpoint.daoState.currentStep;

    // Restore treasury state
    if (checkpoint.daoState.tokenBalances) {
      this.dao.treasury.tokens = new Map(
        Object.entries(checkpoint.daoState.tokenBalances)
      );
    }
    if (checkpoint.daoState.tokenPrices) {
      this.dao.treasury.tokenPrices = new Map(
        Object.entries(checkpoint.daoState.tokenPrices)
      );
    }

    // Restore agent states
    const agentMap = new Map(this.dao.members.map(a => [a.uniqueId, a]));
    for (const agentState of checkpoint.agentStates) {
      const agent = agentMap.get(agentState.uniqueId);
      if (agent) {
        agent.tokens = agentState.tokens;
        agent.reputation = agentState.reputation;
        agent.stakedTokens = agentState.stakedTokens;
        agent.optimism = agentState.optimism;
        agent.stakeLocks = agentState.stakeLocks || [];
        agent.transferCooldown = agentState.transferCooldown || 0;
        agent.recentTokenInflow = 0;
        agent.lastTokenVelocityStep = this.currentStep;
        if (agentState.delegations) {
          agent.delegations = new Map(Object.entries(agentState.delegations));
        }
        if (agentState.votes) {
          agent.votes = new Map(
            Object.entries(agentState.votes) as [string, { vote: boolean; weight: number }][]
          );
        }
      }
    }

    // CRITICAL: Restore RNG state for deterministic replay
    if (checkpoint.rngState) {
      setRandomState(checkpoint.rngState);
    }

    this.eventBus.publish('checkpoint_loaded', {
      step: this.currentStep,
      checkpointId,
      restoredAgents: checkpoint.agentStates.length,
      rngRestored: !!checkpoint.rngState,
    });

    return true;
  }

  /**
   * Export data to CSV
   */
  exportToCSV(): string {
    if (this.eventLogger) {
      return this.eventLogger.toCSV();
    }
    return '';
  }

  // =========================================================================
  // LEARNING LIFECYCLE MANAGEMENT
  // =========================================================================

  /**
   * Signal end of episode to all learning agents.
   * This decays exploration rates, increments episode counts,
   * and resets reward shapers for the next episode.
   */
  endLearningEpisode(): void {
    for (const member of this.dao.members) {
      const agent = member as unknown as LearningCapable;
      if (typeof agent.endEpisode === 'function') {
        agent.endEpisode();
      }
    }

    // Reset reward shapers (clear stored potential context)
    for (const shaper of this.rewardShapers.values()) {
      shaper.reset();
    }
  }

  /**
   * Export Q-tables from all learning agents, grouped by agent type.
   * Returns a map of agentType -> array of serialized learning states.
   */
  exportLearningStates(): Map<string, LearningState[]> {
    const statesByType = new Map<string, LearningState[]>();

    for (const member of this.dao.members) {
      const agent = member as unknown as LearningCapable;
      if (typeof agent.exportLearningState !== 'function') continue;

      const typeName = member.constructor.name;
      if (!statesByType.has(typeName)) {
        statesByType.set(typeName, []);
      }
      statesByType.get(typeName)!.push(agent.exportLearningState());
    }

    return statesByType;
  }

  /**
   * Import Q-tables into learning agents from a prior run's exported states.
   * Each agent of a given type imports the corresponding state by index,
   * cycling if there are more agents than saved states.
   */
  importLearningStates(statesByType: Map<string, LearningState[]>): void {
    // Build per-type agent lists
    const agentsByType = new Map<string, LearningCapable[]>();
    for (const member of this.dao.members) {
      const agent = member as unknown as LearningCapable;
      if (typeof agent.importLearningState !== 'function') continue;

      const typeName = member.constructor.name;
      if (!agentsByType.has(typeName)) {
        agentsByType.set(typeName, []);
      }
      agentsByType.get(typeName)!.push(agent);
    }

    // Import states
    for (const [typeName, agents] of agentsByType) {
      const states = statesByType.get(typeName);
      if (!states || states.length === 0) continue;

      for (let i = 0; i < agents.length; i++) {
        // Cycle through available states if more agents than states
        const stateIndex = i % states.length;
        agents[i].importLearningState!(states[stateIndex]);
      }
    }
  }

  /**
   * Merge Q-tables across same-type agents for shared experience learning.
   * Each agent of the same type merges knowledge from all other agents of that type.
   */
  mergeSharedExperience(): void {
    // Group learning agents by type
    const agentsByType = new Map<string, LearningCapable[]>();
    for (const member of this.dao.members) {
      const agent = member as unknown as LearningCapable;
      if (!agent.learning || typeof agent.learning.mergeFrom !== 'function') continue;

      const typeName = member.constructor.name;
      if (!agentsByType.has(typeName)) {
        agentsByType.set(typeName, []);
      }
      agentsByType.get(typeName)!.push(agent);
    }

    // For each type with multiple agents, merge Q-tables
    for (const [, agents] of agentsByType) {
      if (agents.length < 2) continue;

      // Use federated averaging: each agent merges from all others with weight 1/N
      const mergeWeight = 1 / agents.length;
      for (let i = 0; i < agents.length; i++) {
        for (let j = 0; j < agents.length; j++) {
          if (i === j) continue;
          agents[i].learning!.mergeFrom(agents[j].learning!, mergeWeight);
        }
      }
    }
  }

  /**
   * Get simulation summary
   */
  getSummary(): any {
    return {
      step: this.currentStep,
      members: this.dao.members.length,
      proposals: this.dao.proposals.length,
      projects: this.dao.projects.length,
      tokenPrice: this.dao.treasury.getTokenPrice('DAO_TOKEN'),
      treasuryFunds: this.dao.treasury.funds,
      dataCollector: this.dataCollector.getLatestStats(),
    };
  }
}
