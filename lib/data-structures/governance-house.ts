/**
 * Governance House
 *
 * Supports bicameral governance systems like Optimism's Token House + Citizens House.
 * Each house can have different voting weights, quorum requirements, and veto powers.
 */

import type { DAO } from './dao';
import type { MultiStageProposal, HouseType, HouseVoteResult } from './multi-stage-proposal';

// =============================================================================
// TYPES
// =============================================================================

export interface HouseMember {
  memberId: string;
  votingPower: number;
  delegatedPower: number;
  joinedStep: number;
  isActive: boolean;
}

export interface HouseConfig {
  houseType: HouseType;
  name: string;
  description: string;
  quorumPercent: number;
  approvalThresholdPercent: number;
  vetoCapable: boolean;
  vetoPeriodSteps: number;
  voteWeightModel: 'token' | 'one_person_one_vote' | 'reputation' | 'quadratic';
  cadence?: string;  // e.g., "biweekly", "as_needed"
  primaryDecisions: string[];  // What this house decides on
}

export interface HouseVote {
  memberId: string;
  proposalId: string;
  vote: boolean;  // true = for, false = against
  weight: number;
  timestamp: number;
  reason?: string;
}

export interface HouseStats {
  totalMembers: number;
  activeMembers: number;
  totalVotingPower: number;
  proposalsVoted: number;
  averageParticipation: number;
  vetoesTriggered: number;
}

// =============================================================================
// GOVERNANCE HOUSE
// =============================================================================

export class GovernanceHouse {
  readonly houseType: HouseType;
  readonly name: string;
  readonly description: string;
  private dao: DAO;
  private config: HouseConfig;

  private members: Map<string, HouseMember> = new Map();
  private votes: Map<string, HouseVote[]> = new Map();  // proposalId -> votes
  private vetoCount: number = 0;

  constructor(dao: DAO, config: HouseConfig) {
    this.dao = dao;
    this.config = config;
    this.houseType = config.houseType;
    this.name = config.name;
    this.description = config.description;
  }

  // ---------------------------------------------------------------------------
  // MEMBERSHIP MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Add a member to the house
   */
  addMember(memberId: string, votingPower: number = 1): void {
    if (this.members.has(memberId)) {
      // Update existing member's voting power
      const member = this.members.get(memberId)!;
      member.votingPower = votingPower;
      member.isActive = true;
      return;
    }

    this.members.set(memberId, {
      memberId,
      votingPower,
      delegatedPower: 0,
      joinedStep: this.dao.currentStep,
      isActive: true,
    });

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('house_member_added', {
        step: this.dao.currentStep,
        house: this.houseType,
        memberId,
        votingPower,
      });
    }
  }

  /**
   * Remove a member from the house
   */
  removeMember(memberId: string): boolean {
    const member = this.members.get(memberId);
    if (!member) return false;

    member.isActive = false;

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('house_member_removed', {
        step: this.dao.currentStep,
        house: this.houseType,
        memberId,
      });
    }

    return true;
  }

  /**
   * Check if a member belongs to this house
   */
  isMember(memberId: string): boolean {
    const member = this.members.get(memberId);
    return member !== undefined && member.isActive;
  }

  /**
   * Get a member's voting power in this house
   */
  getMemberVotingPower(memberId: string): number {
    const member = this.members.get(memberId);
    if (!member || !member.isActive) return 0;
    return member.votingPower + member.delegatedPower;
  }

  /**
   * Delegate voting power to another member
   */
  delegate(fromId: string, toId: string, amount: number): boolean {
    const from = this.members.get(fromId);
    const to = this.members.get(toId);

    if (!from || !to || !from.isActive || !to.isActive) return false;
    if (amount > from.votingPower) return false;

    from.votingPower -= amount;
    to.delegatedPower += amount;

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('house_delegation', {
        step: this.dao.currentStep,
        house: this.houseType,
        from: fromId,
        to: toId,
        amount,
      });
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // VOTING
  // ---------------------------------------------------------------------------

  /**
   * Cast a vote on a proposal
   */
  vote(
    memberId: string,
    proposalId: string,
    support: boolean,
    reason?: string
  ): boolean {
    if (!this.isMember(memberId)) return false;

    const weight = this.getMemberVotingPower(memberId);
    if (weight <= 0) return false;

    // Check if already voted
    const proposalVotes = this.votes.get(proposalId) || [];
    const existingVote = proposalVotes.find(v => v.memberId === memberId);
    if (existingVote) return false;  // Already voted

    const vote: HouseVote = {
      memberId,
      proposalId,
      vote: support,
      weight,
      timestamp: this.dao.currentStep,
      reason,
    };

    proposalVotes.push(vote);
    this.votes.set(proposalId, proposalVotes);

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('house_vote_cast', {
        step: this.dao.currentStep,
        house: this.houseType,
        memberId,
        proposalId,
        support,
        weight,
      });
    }

    return true;
  }

  /**
   * Get vote result for a proposal
   */
  getVoteResult(proposalId: string): HouseVoteResult {
    const proposalVotes = this.votes.get(proposalId) || [];

    let votesFor = 0;
    let votesAgainst = 0;

    for (const vote of proposalVotes) {
      if (vote.vote) {
        votesFor += vote.weight;
      } else {
        votesAgainst += vote.weight;
      }
    }

    const totalVotes = votesFor + votesAgainst;
    const totalPower = this.getTotalVotingPower();
    const quorumVotes = (totalPower * this.config.quorumPercent) / 100;
    const quorumMet = totalVotes >= quorumVotes;

    const approvalPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
    const approved = quorumMet && approvalPercent >= this.config.approvalThresholdPercent;

    return {
      house: this.houseType,
      votesFor,
      votesAgainst,
      quorumMet,
      approved,
    };
  }

  /**
   * Check if house has approved a proposal
   */
  hasApproved(proposalId: string): boolean {
    return this.getVoteResult(proposalId).approved;
  }

  // ---------------------------------------------------------------------------
  // VETO POWER
  // ---------------------------------------------------------------------------

  /**
   * Check if this house can veto proposals
   */
  get canVeto(): boolean {
    return this.config.vetoCapable;
  }

  /**
   * Get the veto window in steps
   */
  get vetoWindowSteps(): number {
    return this.config.vetoPeriodSteps;
  }

  /**
   * Trigger a veto on a proposal
   */
  triggerVeto(proposalId: string, reason: string = 'House veto'): boolean {
    if (!this.canVeto) return false;

    this.vetoCount++;

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('house_veto_triggered', {
        step: this.dao.currentStep,
        house: this.houseType,
        proposalId,
        reason,
        totalVetoes: this.vetoCount,
      });
    }

    return true;
  }

  /**
   * Check if veto threshold is met based on votes against
   * For Citizens House veto, typically >50% voting against triggers veto
   */
  checkVetoCondition(proposalId: string, vetoThresholdPercent: number = 50): boolean {
    const result = this.getVoteResult(proposalId);
    const totalVotes = result.votesFor + result.votesAgainst;

    if (totalVotes === 0) return false;

    const againstPercent = (result.votesAgainst / totalVotes) * 100;
    return againstPercent >= vetoThresholdPercent;
  }

  // ---------------------------------------------------------------------------
  // STATISTICS & QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Get total voting power in the house
   */
  getTotalVotingPower(): number {
    let total = 0;
    for (const member of this.members.values()) {
      if (member.isActive) {
        total += member.votingPower + member.delegatedPower;
      }
    }
    return total;
  }

  /**
   * Get all active members
   */
  getActiveMembers(): HouseMember[] {
    return Array.from(this.members.values()).filter(m => m.isActive);
  }

  /**
   * Get member count
   */
  getMemberCount(): number {
    return this.getActiveMembers().length;
  }

  /**
   * Get votes for a proposal
   */
  getProposalVotes(proposalId: string): HouseVote[] {
    return this.votes.get(proposalId) || [];
  }

  /**
   * Calculate participation rate for a proposal
   */
  getParticipationRate(proposalId: string): number {
    const proposalVotes = this.votes.get(proposalId) || [];
    const voterCount = proposalVotes.length;
    const memberCount = this.getMemberCount();

    if (memberCount === 0) return 0;
    return (voterCount / memberCount) * 100;
  }

  /**
   * Get house statistics
   */
  getStats(): HouseStats {
    const members = this.getActiveMembers();
    let totalParticipation = 0;
    let proposalCount = 0;

    for (const [_, votes] of this.votes.entries()) {
      const participation = votes.length / Math.max(members.length, 1);
      totalParticipation += participation;
      proposalCount++;
    }

    return {
      totalMembers: this.members.size,
      activeMembers: members.length,
      totalVotingPower: this.getTotalVotingPower(),
      proposalsVoted: proposalCount,
      averageParticipation: proposalCount > 0 ? (totalParticipation / proposalCount) * 100 : 0,
      vetoesTriggered: this.vetoCount,
    };
  }

  /**
   * Get house configuration
   */
  getConfig(): HouseConfig {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // SERIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Serialize to plain object
   */
  toDict(): {
    config: HouseConfig;
    members: Record<string, HouseMember>;
    votes: Record<string, HouseVote[]>;
    vetoCount: number;
  } {
    return {
      config: this.config,
      members: Object.fromEntries(this.members),
      votes: Object.fromEntries(this.votes),
      vetoCount: this.vetoCount,
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(
    data: {
      config: HouseConfig;
      members?: Record<string, HouseMember>;
      votes?: Record<string, HouseVote[]>;
      vetoCount?: number;
    },
    dao: DAO
  ): GovernanceHouse {
    const house = new GovernanceHouse(dao, data.config);

    if (data.members) {
      for (const [id, member] of Object.entries(data.members)) {
        house.members.set(id, member);
      }
    }

    if (data.votes) {
      for (const [id, votes] of Object.entries(data.votes)) {
        house.votes.set(id, votes);
      }
    }

    if (data.vetoCount !== undefined) {
      house.vetoCount = data.vetoCount;
    }

    return house;
  }
}

// =============================================================================
// BICAMERAL GOVERNANCE SYSTEM
// =============================================================================

/**
 * Manages multiple governance houses (bicameral or multicameral systems)
 */
export class BicameralGovernance {
  private houses: Map<HouseType, GovernanceHouse> = new Map();
  private dao: DAO;

  constructor(dao: DAO) {
    this.dao = dao;
  }

  /**
   * Add a house to the governance system
   */
  addHouse(config: HouseConfig): GovernanceHouse {
    const house = new GovernanceHouse(this.dao, config);
    this.houses.set(config.houseType, house);
    return house;
  }

  /**
   * Get a house by type
   */
  getHouse(houseType: HouseType): GovernanceHouse | undefined {
    return this.houses.get(houseType);
  }

  /**
   * Get all houses
   */
  getAllHouses(): GovernanceHouse[] {
    return Array.from(this.houses.values());
  }

  /**
   * Check if all required houses have approved
   */
  allHousesApproved(proposalId: string, requiredHouses: HouseType[]): boolean {
    for (const houseType of requiredHouses) {
      const house = this.houses.get(houseType);
      if (!house || !house.hasApproved(proposalId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if any veto-capable house has vetoed
   */
  anyHouseVetoed(proposalId: string): { vetoed: boolean; byHouse?: HouseType } {
    for (const [houseType, house] of this.houses.entries()) {
      if (house.canVeto && house.checkVetoCondition(proposalId)) {
        return { vetoed: true, byHouse: houseType };
      }
    }
    return { vetoed: false };
  }

  /**
   * Get combined vote result across houses
   */
  getCombinedResult(proposalId: string): {
    houseResults: Map<HouseType, HouseVoteResult>;
    allApproved: boolean;
    anyVetoed: boolean;
    vetoingHouse?: HouseType;
  } {
    const houseResults = new Map<HouseType, HouseVoteResult>();
    let allApproved = true;

    for (const [houseType, house] of this.houses.entries()) {
      const result = house.getVoteResult(proposalId);
      houseResults.set(houseType, result);

      if (!result.approved) {
        allApproved = false;
      }
    }

    const vetoCheck = this.anyHouseVetoed(proposalId);

    return {
      houseResults,
      allApproved,
      anyVetoed: vetoCheck.vetoed,
      vetoingHouse: vetoCheck.byHouse,
    };
  }

  /**
   * Add member to a house
   */
  addMemberToHouse(houseType: HouseType, memberId: string, votingPower: number = 1): boolean {
    const house = this.houses.get(houseType);
    if (!house) return false;

    house.addMember(memberId, votingPower);
    return true;
  }

  /**
   * Cast vote in a specific house
   */
  voteInHouse(
    houseType: HouseType,
    memberId: string,
    proposalId: string,
    support: boolean,
    reason?: string
  ): boolean {
    const house = this.houses.get(houseType);
    if (!house) return false;

    return house.vote(memberId, proposalId, support, reason);
  }

  /**
   * Serialize to plain object
   */
  toDict(): Record<string, ReturnType<GovernanceHouse['toDict']>> {
    const result: Record<string, ReturnType<GovernanceHouse['toDict']>> = {};
    for (const [type, house] of this.houses.entries()) {
      result[type] = house.toDict();
    }
    return result;
  }

  /**
   * Restore from serialized data
   */
  static fromDict(
    data: Record<string, ReturnType<GovernanceHouse['toDict']>>,
    dao: DAO
  ): BicameralGovernance {
    const bicameral = new BicameralGovernance(dao);

    for (const [_, houseData] of Object.entries(data)) {
      const house = GovernanceHouse.fromDict(houseData, dao);
      bicameral.houses.set(house.houseType, house);
    }

    return bicameral;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create Optimism-style bicameral governance
 */
export function createOptimismBicameral(dao: DAO): BicameralGovernance {
  const bicameral = new BicameralGovernance(dao);

  // Token House - main decision making
  bicameral.addHouse({
    houseType: 'token_house',
    name: 'Token House',
    description: 'OP token holders and their delegates',
    quorumPercent: 30,
    approvalThresholdPercent: 51,
    vetoCapable: false,
    vetoPeriodSteps: 0,
    voteWeightModel: 'token',
    cadence: 'biweekly',
    primaryDecisions: [
      'treasury_spending',
      'protocol_upgrades',
      'governance_changes',
      'grant_programs',
    ],
  });

  // Citizens House - veto power and RetroPGF
  bicameral.addHouse({
    houseType: 'citizens_house',
    name: 'Citizens House',
    description: 'Citizens with soulbound badges',
    quorumPercent: 20,
    approvalThresholdPercent: 51,
    vetoCapable: true,
    vetoPeriodSteps: 168,  // 7 days
    voteWeightModel: 'one_person_one_vote',
    primaryDecisions: [
      'retro_pgf_allocation',
      'citizenship_grants',
      'upgrade_vetoes',
    ],
  });

  return bicameral;
}

/**
 * Create Arbitrum-style governance with Security Council
 */
export function createArbitrumGovernance(dao: DAO): BicameralGovernance {
  const bicameral = new BicameralGovernance(dao);

  // Main governance (ARB token holders)
  bicameral.addHouse({
    houseType: 'token_house',
    name: 'ARB Governance',
    description: 'ARB token holders',
    quorumPercent: 5,  // Constitutional default
    approvalThresholdPercent: 51,
    vetoCapable: false,
    vetoPeriodSteps: 0,
    voteWeightModel: 'token',
    primaryDecisions: [
      'constitutional_changes',
      'non_constitutional_proposals',
      'treasury_spending',
    ],
  });

  // Security Council
  bicameral.addHouse({
    houseType: 'security_council',
    name: 'Security Council',
    description: '12-member elected council',
    quorumPercent: 75,  // 9 of 12
    approvalThresholdPercent: 75,
    vetoCapable: true,
    vetoPeriodSteps: 72,  // 3 days emergency
    voteWeightModel: 'one_person_one_vote',
    primaryDecisions: [
      'emergency_upgrades',
      'security_patches',
    ],
  });

  return bicameral;
}
