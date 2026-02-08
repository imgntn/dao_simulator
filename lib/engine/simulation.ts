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
import type { Proposal } from '../data-structures/proposal';

// Type for agent constructor classes - uses DAOModel since that's what agents accept
type AgentClass = new (
  uniqueId: string,
  model: DAOModel,
  ...args: unknown[]
) => DAOMember;

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
  useSharedRandom?: boolean;
  // Governance rule configuration (quorum percentage, thresholds, etc.)
  governance_config?: GovernanceRuleConfig;
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

    // Initialize treasury with funding
    const initialFunding = constants.INITIAL_TREASURY_FUNDING;
    this.dao.treasury.deposit('DAO_TOKEN', initialFunding, this.currentStep);


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
      config.centralityInterval ?? 1
    );

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
    const votedCount = (member as any).votes?.size ?? 0;
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
      const agent = member as any;
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
      const agent = member as any;
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
    (this.dao as any).currentShock = severity;

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
      const isMultiStage = this.isMultiStageProposal(proposal);
      const inVotingStage = !isMultiStage || (proposal as any).isInVotingStage;

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
          requiredQuorum: (this.governanceRule as any).quorumPercentage ?? 0,
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
                  (member as any).delegationBudget = Math.min(
                    (member as any).delegationBudget + amount,
                    (member as any).maxDelegationBudget
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
      const quorumConfig = (this.governanceRule as any).quorumPercentage;
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
                    (member as any).delegationBudget = Math.min(
                      (member as any).delegationBudget + amount,
                      (member as any).maxDelegationBudget
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
                (member as any).delegationBudget = Math.min(
                  (member as any).delegationBudget + amount,
                  (member as any).maxDelegationBudget
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

  private isMultiStageProposal(proposal: Proposal): boolean {
    return Array.isArray((proposal as any).stageConfigs);
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
    // Target: treasury should be stable or slightly growing over time

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

    const totalRevenue = proposalFees + treasuryStakingYield + memberActivityFee + transactionFees;
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
      const agent = member as any;
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
      const agent = member as any;
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
    const agentsByType = new Map<string, any[]>();
    for (const member of this.dao.members) {
      const agent = member as any;
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
        agents[i].importLearningState(states[stateIndex]);
      }
    }
  }

  /**
   * Merge Q-tables across same-type agents for shared experience learning.
   * Each agent of the same type merges knowledge from all other agents of that type.
   */
  mergeSharedExperience(): void {
    // Group learning agents by type
    const agentsByType = new Map<string, any[]>();
    for (const member of this.dao.members) {
      const agent = member as any;
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
          agents[i].learning.mergeFrom(agents[j].learning, mergeWeight);
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
