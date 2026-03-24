/**
 * Simulation Worker
 *
 * Web Worker entry point that runs the DAOSimulation engine off the main thread.
 * Communicates via postMessage with structured clone.
 */

/// <reference lib="webworker" />

import { DAOSimulation } from '../engine/simulation';
import type { DAOSimulationConfig } from '../engine/simulation';
import { CalibrationLoader } from '../digital-twins/calibration-loader';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';
import { BrowserCalibrationProvider } from './browser-calibration-provider';
import { extractSnapshot, clearTokenHistories } from './snapshot-extractor';
import type {
  WorkerInMessage,
  WorkerOutMessage,
  BrowserSimConfig,
  SimulationEvent,
} from './worker-protocol';
// Lazy-loaded to avoid pulling full dependency tree at startup
let _getRule: typeof import('../utils/governance-plugins').getRule | null = null;
async function lazyGetRule() {
  if (!_getRule) {
    const mod = await import('../utils/governance-plugins');
    _getRule = mod.getRule;
  }
  return _getRule;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let sim: DAOSimulation | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let stepsPerSecond = 10;
let recentEvents: SimulationEvent[] = [];
let eventBuffer: SimulationEvent[] = [];
const MAX_RECENT_EVENTS = 30;

/** Convert BrowserSimConfig to DAOSimulationConfig */
function toSimConfig(config: BrowserSimConfig, profile: CalibrationProfile | null): DAOSimulationConfig {
  const simConfig: DAOSimulationConfig = {
    seed: config.seed,
    calibration_dao_id: config.daoId,
    forum_enabled: config.forumEnabled ?? true,
    collectionInterval: 1, // Per-step collection for real-time dashboard
    eventLogging: false,
    exportCsv: false,
    checkpointInterval: 0,
    // LLM disabled in browser
    llm_enabled: false,
    llm_agent_mode: 'disabled' as const,
    num_llm_agents: 0,
    num_llm_reporters: 0,
    // Learning disabled for browser perf
    learning_enabled: false,
  };

  // Agent counts
  if (config.numDevelopers !== undefined) simConfig.num_developers = config.numDevelopers;
  if (config.numInvestors !== undefined) simConfig.num_investors = config.numInvestors;
  if (config.numTraders !== undefined) simConfig.num_traders = config.numTraders;
  if (config.numDelegators !== undefined) simConfig.num_delegators = config.numDelegators;
  if (config.numProposalCreators !== undefined) simConfig.num_proposal_creators = config.numProposalCreators;
  if (config.numValidators !== undefined) simConfig.num_validators = config.numValidators;
  if (config.numPassiveMembers !== undefined) simConfig.num_passive_members = config.numPassiveMembers;
  if (config.numGovernanceExperts !== undefined) simConfig.num_governance_experts = config.numGovernanceExperts;
  if (config.numGovernanceWhales !== undefined) simConfig.num_governance_whales = config.numGovernanceWhales;
  if (config.numRiskManagers !== undefined) simConfig.num_risk_managers = config.numRiskManagers;
  if (config.numSpeculators !== undefined) simConfig.num_speculators = config.numSpeculators;
  if (config.numStakers !== undefined) simConfig.num_stakers = config.numStakers;

  // Governance rule
  if (config.governanceRule) {
    simConfig.governance_rule = config.governanceRule;
  }
  if (config.governanceQuorumPercentage !== undefined) {
    simConfig.governance_config = {
      ...simConfig.governance_config,
      quorumPercentage: config.governanceQuorumPercentage,
    };
  }
  if (config.votePowerQuadraticThreshold !== undefined) {
    simConfig.vote_power_quadratic_threshold = config.votePowerQuadraticThreshold;
  }

  // Learning
  if (config.learningEnabled !== undefined) {
    simConfig.learning_enabled = config.learningEnabled;
  }

  // Black swan
  if (config.blackSwanEnabled !== undefined) {
    simConfig.black_swan_enabled = config.blackSwanEnabled;
  }
  if (config.blackSwanFrequency !== undefined) {
    simConfig.black_swan_frequency = config.blackSwanFrequency;
  }
  if (config.blackSwanSeverityScale !== undefined) {
    simConfig.black_swan_severity_scale = config.blackSwanSeverityScale;
  }
  if (config.scheduledBlackSwans?.length) {
    simConfig.black_swan_scheduled_events = config.scheduledBlackSwans;
    simConfig.black_swan_enabled = true;
  }

  return simConfig;
}

/** Wire up event bus to capture events for the snapshot */
function wireEvents(simulation: DAOSimulation): void {
  const bus = simulation.eventBus;

  bus.subscribe('proposal_created', (data: Record<string, unknown>) => {
    pushEvent('proposal_created', `Proposal created: ${data.title || data.proposalId || 'unknown'}`);
  });

  bus.subscribe('proposal_approved', (data: Record<string, unknown>) => {
    pushEvent('proposal_approved', `Proposal approved: ${data.proposalId || 'unknown'}`);
  });

  bus.subscribe('proposal_rejected', (data: Record<string, unknown>) => {
    pushEvent('proposal_rejected', `Proposal rejected: ${data.proposalId || 'unknown'}`);
  });

  bus.subscribe('proposal_expired', (data: Record<string, unknown>) => {
    pushEvent('proposal_expired', `Proposal expired: ${data.proposalId || 'unknown'}`);
  });

  bus.subscribe('vote_cast', (data: Record<string, unknown>) => {
    pushEvent('vote_cast', `${data.voterId || 'Agent'} voted ${data.vote ? 'FOR' : 'AGAINST'}`);
  });

  bus.subscribe('black_swan', (data: Record<string, unknown>) => {
    pushEvent('black_swan', `Black Swan: ${data.name || data.category || 'unknown event'} (severity: ${data.severity || '?'})`);
  });

  bus.subscribe('market_shock', (data: Record<string, unknown>) => {
    pushEvent('price_change', `Market shock: ${data.magnitude || 'unknown'}`);
  });
}

function pushEvent(type: SimulationEvent['type'], message: string): void {
  const event: SimulationEvent = {
    step: sim?.currentStep ?? 0,
    type,
    message,
  };
  eventBuffer.push(event);
  // Keep buffer bounded
  if (eventBuffer.length > MAX_RECENT_EVENTS * 2) {
    eventBuffer = eventBuffer.slice(-MAX_RECENT_EVENTS);
  }
}

/** Run a single simulation step and post snapshot */
async function runStep(): Promise<void> {
  if (!sim) return;

  try {
    // Clear event buffer for this step
    eventBuffer = [];

    await sim.step();

    // Merge new events into recent events list
    recentEvents = [...recentEvents, ...eventBuffer].slice(-MAX_RECENT_EVENTS);

    const snapshot = extractSnapshot(sim, recentEvents.slice(-20));
    postOut({ type: 'stepComplete', snapshot });
  } catch (error) {
    const err = error as Error;
    postOut({ type: 'error', message: err.message, stack: err.stack });
    stopLoop();
  }
}

function startLoop(): void {
  stopLoop();
  const intervalMs = Math.max(16, Math.round(1000 / stepsPerSecond));
  intervalId = setInterval(() => {
    runStep();
  }, intervalMs);
}

function stopLoop(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function postOut(msg: WorkerOutMessage): void {
  ctx.postMessage(msg);
}

/** Handle messages from main thread */
ctx.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'init': {
        // Set up calibration provider
        const provider = new BrowserCalibrationProvider(msg.calibrationProfiles);
        CalibrationLoader.setProvider(provider);

        // Set up market data override
        DAOSimulation.setMarketData(msg.marketData);

        // Build config
        const profile = provider.loadProfile(msg.config.daoId);
        const simConfig = toSimConfig(msg.config, profile);
        stepsPerSecond = msg.config.stepsPerSecond;

        // Create simulation
        sim = new DAOSimulation(simConfig);
        recentEvents = [];
        eventBuffer = [];

        // Wire events
        wireEvents(sim);

        postOut({
          type: 'initialized',
          daoId: msg.config.daoId,
          agentCount: sim.dao.members.length,
        });
        break;
      }

      case 'start':
        startLoop();
        break;

      case 'pause':
        stopLoop();
        break;

      case 'resume':
        startLoop();
        break;

      case 'step':
        await runStep();
        break;

      case 'setSpeed':
        stepsPerSecond = msg.stepsPerSecond;
        if (intervalId !== null) {
          // Restart loop with new speed
          startLoop();
        }
        break;

      case 'updateConfig':
        // Partial config updates (e.g. speed) without full reset
        if (msg.config.stepsPerSecond !== undefined) {
          stepsPerSecond = msg.config.stepsPerSecond;
          if (intervalId !== null) startLoop();
        }
        break;

      case 'reset': {
        stopLoop();
        recentEvents = [];
        eventBuffer = [];
        clearTokenHistories();

        const resetProfile = CalibrationLoader.load(msg.config.daoId);
        const resetSimConfig = toSimConfig(msg.config, resetProfile);
        stepsPerSecond = msg.config.stepsPerSecond;

        sim = new DAOSimulation(resetSimConfig);
        wireEvents(sim);

        postOut({
          type: 'initialized',
          daoId: msg.config.daoId,
          agentCount: sim.dao.members.length,
        });
        break;
      }

      case 'injectConfig': {
        if (!sim) break;
        const changes = msg.changes;
        // Apply governance rule change live
        if (changes.governanceRule && changes.governanceRule !== '') {
          try {
            const getRuleFn = await lazyGetRule();
            const rule = getRuleFn(changes.governanceRule, {});
            if (rule) {
              (sim as any).governanceRule = rule;
              sim.dao.governanceRuleName = changes.governanceRule;
            }
          } catch { /* ignore invalid rule */ }
        }
        // Toggle forum
        if (changes.forumEnabled !== undefined) {
          (sim as any).forumEnabled = changes.forumEnabled;
        }
        // Toggle black swan
        if (changes.blackSwanEnabled !== undefined) {
          (sim as any).blackSwanEnabled = changes.blackSwanEnabled;
        }
        break;
      }

      case 'injectAgent': {
        if (!sim) break;
        // Get model from an existing member — all agents share the same model
        const existingMember = sim.dao.members[0];
        if (!existingMember) break;
        const model = (existingMember as any).model;
        if (!model) break;

        const { DAOMember: MemberClass } = await import('../agents/base');
        const p = msg.profile;
        const member = new MemberClass(
          p.name || `Custom_${p.type}_${Date.now()}`,
          model,
          p.tokens,
          1.0, // reputation
          'custom',
          undefined,
          sim.dao.daoId
        );
        member.optimism = p.optimism;
        member.oppositionBias = p.oppositionBias;
        sim.dao.members.push(member);
        break;
      }

      case 'forkState': {
        if (!sim) break;
        const forkSnapshot = extractSnapshot(sim, recentEvents.slice(-20));
        postOut({
          type: 'forkedState',
          snapshot: forkSnapshot,
          config: { daoId: '', stepsPerSecond, totalSteps: 720 },
          step: sim.currentStep,
        });
        break;
      }

      case 'dispose':
        stopLoop();
        sim = null;
        recentEvents = [];
        eventBuffer = [];
        CalibrationLoader.setProvider(null);
        DAOSimulation.setMarketData(null);
        postOut({ type: 'disposed' });
        break;
    }
  } catch (error) {
    const err = error as Error;
    postOut({ type: 'error', message: err.message, stack: err.stack });
  }
};

// Signal ready
postOut({ type: 'ready' });
