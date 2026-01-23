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
import * as constants from '../config/constants';
import { getRule, GovernanceRuleConfig } from '../utils/governance-plugins';
import { setSeed, resetGlobalRandom, getRandomState, setRandomState, random } from '../utils/random';
import { GovernanceProcessor, createGovernanceProcessor } from '../governance';
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
  RiskManager,
  MarketMaker,
  Whistleblower,
} from '../agents';
import type { DAOMember } from '../agents/base';
import type { DAOModel } from './model';

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
  enableMarketing: boolean;
  marketingLevel: string;
  enablePlayer: boolean;
  tokenEmissionRate: number;
  tokenBurnRate: number;
  stakingInterestRate: number;
  slashFraction: number;
  reputationDecayRate: number;
  marketShockFrequency: number;
  adaptiveLearningRate: number;
  adaptiveEpsilon: number;
  governanceRuleName: string;
  governanceRule: any;

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
  numRLTraders: number;
  numGovernanceExperts: number;
  numRiskManagers: number;
  numMarketMakers: number;
  numWhistleblowers: number;

  // Probabilities and parameters
  commentProbability: number;
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

    // CRITICAL: Reset global random state before setting seed
    // This ensures each simulation starts fresh and is reproducible
    // Without this, state from previous simulations persists
    if (config.seed !== undefined) {
      this.seed = config.seed;
      // Reset and set seed for deterministic runs
      resetGlobalRandom(config.seed);
    } else {
      // No seed provided - use timestamp but still reset to clear old state
      resetGlobalRandom();
      this.seed = undefined;
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
    this.enableMarketing = config.enable_marketing ?? settings.enable_marketing;
    this.marketingLevel = config.marketing_level ?? settings.marketing_level;
    this.enablePlayer = config.enable_player ?? settings.enable_player;
    this.tokenEmissionRate = config.token_emission_rate ?? settings.token_emission_rate;
    this.tokenBurnRate = config.token_burn_rate ?? settings.token_burn_rate;
    this.stakingInterestRate = config.staking_interest_rate ?? settings.staking_interest_rate;
    this.slashFraction = config.slash_fraction ?? settings.slash_fraction;
    this.reputationDecayRate = config.reputation_decay_rate ?? settings.reputation_decay_rate;
    this.marketShockFrequency = config.market_shock_frequency ?? settings.market_shock_frequency;
    this.adaptiveLearningRate = config.adaptive_learning_rate ?? settings.adaptive_learning_rate;
    this.adaptiveEpsilon = config.adaptive_epsilon ?? settings.adaptive_epsilon;

    // Governance
    this.governanceRuleName = config.governance_rule ?? settings.governance_rule;
    // Pass governance config to rule (quorum percentage, thresholds, etc.)
    const rule = getRule(this.governanceRuleName, config.governance_config);
    if (!rule) {
      throw new Error(`Unknown governance rule: ${this.governanceRuleName}`);
    }
    this.governanceRule = rule;

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
    this.numRLTraders = config.num_rl_traders ?? settings.num_rl_traders;
    this.numGovernanceExperts = config.num_governance_experts ?? settings.num_governance_experts;
    this.numRiskManagers = config.num_risk_managers ?? settings.num_risk_managers;
    this.numMarketMakers = config.num_market_makers ?? settings.num_market_makers;
    this.numWhistleblowers = config.num_whistleblowers ?? settings.num_whistleblowers;

    // Probabilities
    this.commentProbability = config.comment_probability ?? settings.comment_probability;
    this.externalPartnerInteractProbability = config.external_partner_interact_probability ?? settings.external_partner_interact_probability;
    this.violationProbability = config.violation_probability ?? settings.violation_probability;
    this.reputationPenalty = config.reputation_penalty ?? settings.reputation_penalty;

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

    // Initialize marketplace
    this.marketplace = new NFTMarketplace(this.eventBus);
    this.dao.marketplace = this.marketplace;

    // Initialize treasury with funding
    const initialFunding = constants.INITIAL_TREASURY_FUNDING;
    this.dao.treasury.deposit('DAO_TOKEN', initialFunding, this.currentStep);

    if (this.enableMarketing) {
      this.dao.treasury.deposit('DAO_TOKEN', constants.MARKETING_BUDGET_BOOST, this.currentStep);
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
      { class: RLTrader as AgentClass, count: this.numRLTraders, params: { learningRate: this.adaptiveLearningRate, epsilon: this.adaptiveEpsilon } },
      { class: GovernanceExpert as AgentClass, count: this.numGovernanceExperts, params: {} },
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

    for (const proposal of openProposals) {
      // Check if voting period has ended
      const votingEnded = this.currentStep > proposal.creationTime + proposal.votingPeriod;

      if (!votingEnded) continue;

      // Record the resolution time
      proposal.resolvedTime = this.currentStep;

      // Check quorum FIRST before applying governance rule
      // This ensures proposals that fail quorum are marked as 'expired', not 'rejected'
      const quorumConfig = (this.governanceRule as any).quorumPercentage;
      if (quorumConfig !== undefined && quorumConfig > 0) {
        const totalTokens = this.dao.members.reduce(
          (sum, member) => sum + member.tokens + member.stakedTokens,
          0
        );
        const votingTokens = proposal.votesFor + proposal.votesAgainst;
        const participationRate = votingTokens / Math.max(totalTokens, 1);

        if (participationRate < quorumConfig) {
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
          continue; // Skip to next proposal
        }
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

      // Update reputation based on voting outcomes
      this.updateReputationFromVoting(proposal, approved);
    }
  }

  /**
   * Perform treasury buybacks if conditions are met
   */
  performBuybacks(): void {
    const treasury = this.dao.treasury;
    const price = treasury.getTokenPrice('DAO_TOKEN');
    const funds = treasury.funds;

    if (
      funds >= constants.BUYBACK_FUND_THRESHOLD &&
      price < constants.BUYBACK_PRICE_THRESHOLD
    ) {
      const buybackAmount = funds * constants.BUYBACK_PERCENTAGE;
      const bought = buybackAmount / price;

      treasury.withdraw('DAO_TOKEN', buybackAmount, this.currentStep);

      this.eventBus.publish('buyback_executed', {
        step: this.currentStep,
        amount: buybackAmount,
        tokens: bought,
        price,
      });
    }
  }

  /**
   * Step the simulation forward
   * Note: When using async schedulers (ParallelActivation, AsyncActivation),
   * this method MUST be awaited to ensure agents complete their steps.
   */
  async step(): Promise<void> {
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
      this.dao.treasury.deposit('DAO_TOKEN', this.tokenEmissionRate, this.currentStep);
    }

    // Token burning
    if (this.tokenBurnRate > 0) {
      this.dao.treasury.withdraw('DAO_TOKEN', this.tokenBurnRate, this.currentStep);
    }

    // Treasury revenue mechanisms (fixes treasury decline issue)
    // 1. Proposal activity fees: Small fee per active proposal per step
    const activeProposals = this.dao.proposals.filter(p => p.status === 'open').length;
    const proposalFees = activeProposals * 0.1; // 0.1 tokens per active proposal per step

    // 2. Staking yield to treasury: Portion of staking rewards goes to treasury
    const totalStaked = this.dao.members.reduce((sum, m) => sum + m.stakedTokens, 0);
    const treasuryStakingYield = totalStaked * 0.0005; // 0.05% per step to treasury

    // 3. Member activity fees: Nominal fee from active member participation
    const memberActivityFee = this.dao.members.length * 0.01; // 0.01 tokens per member per step

    const totalRevenue = proposalFees + treasuryStakingYield + memberActivityFee;
    if (totalRevenue > 0) {
      this.dao.treasury.deposit('DAO_TOKEN', totalRevenue, this.currentStep);

      // Emit revenue event for tracking
      this.eventBus.publish('treasury_revenue', {
        step: this.currentStep,
        proposalFees,
        stakingYield: treasuryStakingYield,
        memberFees: memberActivityFee,
        total: totalRevenue,
      });
    }

    // Step agents - await to handle async schedulers
    const result = this.schedule.step();
    if (result instanceof Promise) {
      await result;
    }

    // Agent lifecycle management
    this.agentManager.addNewMembers();
    this.agentManager.cullMembers();

    // Reputation decay
    this.reputationTracker.decayReputation();

    // Resolve basic proposals whose voting period has ended
    this.resolveBasicProposals();

    // Process governance systems (timelocks, multi-stage proposals, etc.)
    if (this.governanceProcessor) {
      this.governanceProcessor.processStep(this.currentStep);
    }

    // Update token prices with market dynamics
    this.dao.treasury.updatePrices(0.02); // 2% volatility per step

    // Treasury buybacks
    this.performBuybacks();

    // Collect data
    this.dataCollector.collect(this.dao);

    // Update step counter
    this.currentStep++;
    // CRITICAL: Sync DAO's currentStep with simulation's currentStep
    // This is needed for governance rules that use dao.currentStep (e.g., ConvictionVotingRule)
    this.dao.currentStep = this.currentStep;

    // Emit step_end event
    this.eventBus.publish('step_end', { step: this.currentStep });

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
      this.dao.treasury.tokenBalances = new Map(
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
