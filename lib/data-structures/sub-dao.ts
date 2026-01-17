/**
 * Sub-DAOs / Nested DAOs - Parent-Child DAO Relationships
 *
 * Implements hierarchical DAO structures where a parent DAO can create
 * and manage child DAOs with scoped governance and shared treasury.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type GovernanceScope =
  | 'full'           // Can make any decision within scope
  | 'limited'        // Specific actions only
  | 'advisory';      // Recommendations only, parent executes

export type AutonomyLevel =
  | 'high'           // Minimal parent oversight
  | 'medium'         // Parent can veto
  | 'low';           // Parent must approve all actions

export type FundingRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface FundingRequest {
  requestId: string;
  subDaoId: string;
  amount: number;
  token: string;
  reason: string;
  requestedStep: number;
  status: FundingRequestStatus;
  resolvedStep: number | null;
  approvedBy: string | null;
  rejectedReason: string | null;
}

export interface SubDAOMember {
  memberId: string;
  role: 'admin' | 'member' | 'observer';
  joinedStep: number;
}

export interface SubDAO {
  subDaoId: string;
  name: string;
  parentDaoId: string;
  treasury: Map<string, number>;   // token -> balance
  members: SubDAOMember[];
  governanceScope: GovernanceScope;
  autonomyLevel: AutonomyLevel;
  allowedActions: string[];        // For limited scope
  createdStep: number;
  dissolved: boolean;
  dissolvedStep: number | null;
  metadata: Record<string, unknown>;
  pendingVetoes: string[];         // Proposal IDs pending parent veto
}

export interface SubDAOConfig {
  maxSubDaosPerParent: number;
  minMembersToCreate: number;
  maxFundingRequestAmount: number;
  fundingApprovalSteps: number;    // Steps to wait for approval
  vetoWindowSteps: number;         // Steps parent has to veto
  allowNestedSubDaos: boolean;     // Can sub-DAOs create their own sub-DAOs
}

export interface SubDAOStats {
  totalSubDaos: number;
  activeSubDaos: number;
  dissolvedSubDaos: number;
  totalFundingRequests: number;
  approvedFunding: number;
  pendingFunding: number;
  totalMembers: number;
}

// =============================================================================
// SUB-DAO CONTROLLER
// =============================================================================

export class SubDAOController {
  private subDaos: Map<string, SubDAO> = new Map();
  private parentToSubDaos: Map<string, Set<string>> = new Map();  // parent -> subDaoIds
  private memberToSubDaos: Map<string, Set<string>> = new Map();  // member -> subDaoIds
  private fundingRequests: Map<string, FundingRequest> = new Map();
  private eventBus: EventBus | null = null;
  private subDaoCounter: number = 0;
  private requestCounter: number = 0;

  config: SubDAOConfig;

  constructor(config?: Partial<SubDAOConfig>) {
    this.config = {
      maxSubDaosPerParent: 20,
      minMembersToCreate: 3,
      maxFundingRequestAmount: 1000000,
      fundingApprovalSteps: 48,      // 2 days for approval
      vetoWindowSteps: 24,           // 1 day veto window
      allowNestedSubDaos: false,
      ...config,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Create a new sub-DAO
   */
  createSubDAO(params: {
    name: string;
    parentDaoId: string;
    creator: string;
    initialMembers: Array<{ memberId: string; role: 'admin' | 'member' }>;
    governanceScope: GovernanceScope;
    autonomyLevel: AutonomyLevel;
    allowedActions?: string[];
    metadata?: Record<string, unknown>;
  }, currentStep: number): SubDAO | null {
    // Check max sub-DAOs limit
    const existingSubDaos = this.parentToSubDaos.get(params.parentDaoId) || new Set();
    if (existingSubDaos.size >= this.config.maxSubDaosPerParent) {
      return null;
    }

    // Check minimum members
    if (params.initialMembers.length < this.config.minMembersToCreate) {
      return null;
    }

    // Check if parent is itself a sub-DAO (for nested restriction)
    if (!this.config.allowNestedSubDaos) {
      for (const subDao of this.subDaos.values()) {
        if (subDao.subDaoId === params.parentDaoId && !subDao.dissolved) {
          return null;  // Cannot create sub-DAO of a sub-DAO
        }
      }
    }

    // Generate sub-DAO ID
    this.subDaoCounter++;
    const subDaoId = `subdao_${this.subDaoCounter}`;

    // Create member records
    const members: SubDAOMember[] = params.initialMembers.map(m => ({
      memberId: m.memberId,
      role: m.role,
      joinedStep: currentStep,
    }));

    // Ensure creator is admin
    if (!members.some(m => m.memberId === params.creator && m.role === 'admin')) {
      members.push({
        memberId: params.creator,
        role: 'admin',
        joinedStep: currentStep,
      });
    }

    const subDao: SubDAO = {
      subDaoId,
      name: params.name,
      parentDaoId: params.parentDaoId,
      treasury: new Map(),
      members,
      governanceScope: params.governanceScope,
      autonomyLevel: params.autonomyLevel,
      allowedActions: params.allowedActions || [],
      createdStep: currentStep,
      dissolved: false,
      dissolvedStep: null,
      metadata: params.metadata || {},
      pendingVetoes: [],
    };

    // Store sub-DAO
    this.subDaos.set(subDaoId, subDao);

    // Update parent index
    if (!this.parentToSubDaos.has(params.parentDaoId)) {
      this.parentToSubDaos.set(params.parentDaoId, new Set());
    }
    this.parentToSubDaos.get(params.parentDaoId)!.add(subDaoId);

    // Update member indices
    for (const member of members) {
      if (!this.memberToSubDaos.has(member.memberId)) {
        this.memberToSubDaos.set(member.memberId, new Set());
      }
      this.memberToSubDaos.get(member.memberId)!.add(subDaoId);
    }

    this.emit('subdao_created', {
      step: currentStep,
      subDaoId,
      name: params.name,
      parentDaoId: params.parentDaoId,
      creator: params.creator,
      memberCount: members.length,
      governanceScope: params.governanceScope,
      autonomyLevel: params.autonomyLevel,
    });

    return subDao;
  }

  /**
   * Request funding from parent DAO
   */
  requestFunding(
    subDaoId: string,
    amount: number,
    token: string,
    reason: string,
    requester: string,
    currentStep: number
  ): FundingRequest | null {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao || subDao.dissolved) {
      return null;
    }

    // Check requester is member
    const member = subDao.members.find(m => m.memberId === requester);
    if (!member || member.role === 'observer') {
      return null;
    }

    // Check amount limit
    if (amount > this.config.maxFundingRequestAmount) {
      return null;
    }

    // Generate request ID
    this.requestCounter++;
    const requestId = `funding_${this.requestCounter}`;

    const request: FundingRequest = {
      requestId,
      subDaoId,
      amount,
      token,
      reason,
      requestedStep: currentStep,
      status: 'pending',
      resolvedStep: null,
      approvedBy: null,
      rejectedReason: null,
    };

    this.fundingRequests.set(requestId, request);

    this.emit('subdao_funding_requested', {
      step: currentStep,
      requestId,
      subDaoId,
      parentDaoId: subDao.parentDaoId,
      amount,
      token,
      reason,
      requester,
    });

    return request;
  }

  /**
   * Approve funding request (called by parent DAO)
   */
  approveFunding(
    requestId: string,
    approver: string,
    currentStep: number
  ): boolean {
    const request = this.fundingRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    const subDao = this.subDaos.get(request.subDaoId);
    if (!subDao) {
      return false;
    }

    request.status = 'approved';
    request.resolvedStep = currentStep;
    request.approvedBy = approver;

    // Add to sub-DAO treasury
    const currentBalance = subDao.treasury.get(request.token) || 0;
    subDao.treasury.set(request.token, currentBalance + request.amount);

    this.emit('subdao_funding_approved', {
      step: currentStep,
      requestId,
      subDaoId: request.subDaoId,
      parentDaoId: subDao.parentDaoId,
      amount: request.amount,
      token: request.token,
      approver,
    });

    return true;
  }

  /**
   * Reject funding request
   */
  rejectFunding(
    requestId: string,
    rejector: string,
    reason: string,
    currentStep: number
  ): boolean {
    const request = this.fundingRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'rejected';
    request.resolvedStep = currentStep;
    request.rejectedReason = reason;

    this.emit('subdao_funding_rejected', {
      step: currentStep,
      requestId,
      subDaoId: request.subDaoId,
      rejector,
      reason,
    });

    return true;
  }

  /**
   * Parent veto of sub-DAO action
   */
  parentVeto(
    subDaoId: string,
    proposalId: string,
    vetoer: string,
    reason: string,
    currentStep: number
  ): boolean {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao || subDao.dissolved) {
      return false;
    }

    // Check autonomy level allows veto
    if (subDao.autonomyLevel === 'high') {
      return false;  // High autonomy = no veto
    }

    // Add to pending vetoes
    if (!subDao.pendingVetoes.includes(proposalId)) {
      subDao.pendingVetoes.push(proposalId);
    }

    this.emit('subdao_parent_veto', {
      step: currentStep,
      subDaoId,
      proposalId,
      parentDaoId: subDao.parentDaoId,
      vetoer,
      reason,
    });

    return true;
  }

  /**
   * Check if proposal is vetoed
   */
  isProposalVetoed(subDaoId: string, proposalId: string): boolean {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao) return false;
    return subDao.pendingVetoes.includes(proposalId);
  }

  /**
   * Add member to sub-DAO
   */
  addMember(
    subDaoId: string,
    memberId: string,
    role: 'admin' | 'member' | 'observer',
    currentStep: number
  ): boolean {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao || subDao.dissolved) {
      return false;
    }

    // Check if already member
    if (subDao.members.some(m => m.memberId === memberId)) {
      return false;
    }

    subDao.members.push({
      memberId,
      role,
      joinedStep: currentStep,
    });

    // Update member index
    if (!this.memberToSubDaos.has(memberId)) {
      this.memberToSubDaos.set(memberId, new Set());
    }
    this.memberToSubDaos.get(memberId)!.add(subDaoId);

    this.emit('subdao_member_added', {
      step: currentStep,
      subDaoId,
      memberId,
      role,
    });

    return true;
  }

  /**
   * Remove member from sub-DAO
   */
  removeMember(
    subDaoId: string,
    memberId: string,
    currentStep: number
  ): boolean {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao || subDao.dissolved) {
      return false;
    }

    const memberIndex = subDao.members.findIndex(m => m.memberId === memberId);
    if (memberIndex === -1) {
      return false;
    }

    subDao.members.splice(memberIndex, 1);

    // Update member index
    const memberSubDaos = this.memberToSubDaos.get(memberId);
    if (memberSubDaos) {
      memberSubDaos.delete(subDaoId);
    }

    this.emit('subdao_member_removed', {
      step: currentStep,
      subDaoId,
      memberId,
    });

    return true;
  }

  /**
   * Dissolve a sub-DAO
   */
  dissolve(
    subDaoId: string,
    dissolver: string,
    currentStep: number
  ): { returnedFunds: Map<string, number> } | null {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao || subDao.dissolved) {
      return null;
    }

    subDao.dissolved = true;
    subDao.dissolvedStep = currentStep;

    // Return treasury to parent
    const returnedFunds = new Map(subDao.treasury);
    subDao.treasury.clear();

    // Cancel pending funding requests
    for (const request of this.fundingRequests.values()) {
      if (request.subDaoId === subDaoId && request.status === 'pending') {
        request.status = 'cancelled';
        request.resolvedStep = currentStep;
      }
    }

    this.emit('subdao_dissolved', {
      step: currentStep,
      subDaoId,
      name: subDao.name,
      parentDaoId: subDao.parentDaoId,
      dissolver,
      returnedFunds: Object.fromEntries(returnedFunds),
    });

    return { returnedFunds };
  }

  /**
   * Check if action is allowed for sub-DAO
   */
  isActionAllowed(subDaoId: string, action: string): boolean {
    const subDao = this.subDaos.get(subDaoId);
    if (!subDao || subDao.dissolved) {
      return false;
    }

    if (subDao.governanceScope === 'full') {
      return true;
    }

    if (subDao.governanceScope === 'advisory') {
      return false;  // Advisory can't execute
    }

    // Limited scope - check allowed actions
    return subDao.allowedActions.includes(action);
  }

  /**
   * Process sub-DAOs for current step
   */
  processSubDAOs(currentStep: number): void {
    // Auto-reject funding requests that exceeded approval window
    for (const request of this.fundingRequests.values()) {
      if (
        request.status === 'pending' &&
        currentStep - request.requestedStep > this.config.fundingApprovalSteps
      ) {
        request.status = 'rejected';
        request.resolvedStep = currentStep;
        request.rejectedReason = 'Approval timeout';

        this.emit('subdao_funding_timeout', {
          step: currentStep,
          requestId: request.requestId,
          subDaoId: request.subDaoId,
        });
      }
    }

    // Clear expired vetoes
    for (const subDao of this.subDaos.values()) {
      subDao.pendingVetoes = [];  // Reset each step
    }
  }

  /**
   * Get sub-DAO by ID
   */
  getSubDAO(subDaoId: string): SubDAO | undefined {
    return this.subDaos.get(subDaoId);
  }

  /**
   * Get all sub-DAOs for a parent
   */
  getSubDAOsForParent(parentDaoId: string, activeOnly: boolean = true): SubDAO[] {
    const ids = this.parentToSubDaos.get(parentDaoId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.subDaos.get(id))
      .filter((s): s is SubDAO => {
        if (!s) return false;
        if (activeOnly && s.dissolved) return false;
        return true;
      });
  }

  /**
   * Get all sub-DAOs for a member
   */
  getSubDAOsForMember(memberId: string, activeOnly: boolean = true): SubDAO[] {
    const ids = this.memberToSubDaos.get(memberId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.subDaos.get(id))
      .filter((s): s is SubDAO => {
        if (!s) return false;
        if (activeOnly && s.dissolved) return false;
        return true;
      });
  }

  /**
   * Get pending funding requests for a parent DAO
   */
  getPendingFundingRequests(parentDaoId: string): FundingRequest[] {
    const result: FundingRequest[] = [];

    for (const request of this.fundingRequests.values()) {
      if (request.status !== 'pending') continue;

      const subDao = this.subDaos.get(request.subDaoId);
      if (subDao && subDao.parentDaoId === parentDaoId) {
        result.push(request);
      }
    }

    return result;
  }

  /**
   * Get statistics
   */
  getStats(): SubDAOStats {
    let activeSubDaos = 0;
    let dissolvedSubDaos = 0;
    let totalMembers = 0;
    let approvedFunding = 0;
    let pendingFunding = 0;

    for (const subDao of this.subDaos.values()) {
      if (subDao.dissolved) {
        dissolvedSubDaos++;
      } else {
        activeSubDaos++;
        totalMembers += subDao.members.length;
      }
    }

    for (const request of this.fundingRequests.values()) {
      if (request.status === 'approved') {
        approvedFunding += request.amount;
      } else if (request.status === 'pending') {
        pendingFunding += request.amount;
      }
    }

    return {
      totalSubDaos: this.subDaos.size,
      activeSubDaos,
      dissolvedSubDaos,
      totalFundingRequests: this.fundingRequests.size,
      approvedFunding,
      pendingFunding,
      totalMembers,
    };
  }

  /**
   * Emit event
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event, data as { step: number; [key: string]: unknown });
    }
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    const subDaosArray = Array.from(this.subDaos.entries()).map(([id, subDao]) => [
      id,
      {
        ...subDao,
        treasury: Array.from(subDao.treasury.entries()),
      },
    ]);

    return {
      config: this.config,
      subDaoCounter: this.subDaoCounter,
      requestCounter: this.requestCounter,
      subDaos: subDaosArray,
      parentToSubDaos: Array.from(this.parentToSubDaos.entries()).map(([p, ids]) => [
        p,
        Array.from(ids),
      ]),
      memberToSubDaos: Array.from(this.memberToSubDaos.entries()).map(([m, ids]) => [
        m,
        Array.from(ids),
      ]),
      fundingRequests: Array.from(this.fundingRequests.entries()),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): SubDAOController {
    const controller = new SubDAOController(data.config);
    controller.subDaoCounter = data.subDaoCounter || 0;
    controller.requestCounter = data.requestCounter || 0;

    if (data.subDaos) {
      for (const [id, subDaoData] of data.subDaos) {
        const subDao = {
          ...subDaoData,
          treasury: new Map(subDaoData.treasury),
        };
        controller.subDaos.set(id, subDao);
      }
    }

    if (data.parentToSubDaos) {
      for (const [parent, ids] of data.parentToSubDaos) {
        controller.parentToSubDaos.set(parent, new Set(ids));
      }
    }

    if (data.memberToSubDaos) {
      for (const [member, ids] of data.memberToSubDaos) {
        controller.memberToSubDaos.set(member, new Set(ids));
      }
    }

    if (data.fundingRequests) {
      for (const [id, request] of data.fundingRequests) {
        controller.fundingRequests.set(id, request);
      }
    }

    return controller;
  }
}

/**
 * Factory function to create sub-DAO controller with standard defaults
 */
export function createStandardSubDAOController(): SubDAOController {
  return new SubDAOController({
    maxSubDaosPerParent: 20,
    minMembersToCreate: 3,
    maxFundingRequestAmount: 100000,
    fundingApprovalSteps: 168,      // 1 week
    vetoWindowSteps: 48,            // 2 days
    allowNestedSubDaos: false,
  });
}
