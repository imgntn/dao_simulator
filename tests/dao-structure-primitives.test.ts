/**
 * Tests for DAO structure primitives: SBT gates, inter-DAO proposals, and sub-DAOs.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  SoulboundTokenRegistry,
  createOptimismSBTRegistry,
} from '../lib/data-structures/soulbound-token';
import { InterDAOProposal } from '../lib/data-structures/inter-dao-proposal';
import {
  SubDAOController,
  createStandardSubDAOController,
} from '../lib/data-structures/sub-dao';
import { EventBus } from '../lib/utils/event-bus';

describe('SoulboundTokenRegistry', () => {
  let registry: SoulboundTokenRegistry;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    registry = new SoulboundTokenRegistry({
      allowSelfRevoke: false,
      requireIssuerForRevoke: true,
      maxTokensPerHolder: 2,
      defaultExpirationSteps: 10,
    });
    registry.setEventBus(eventBus);
  });

  it('issues expiring tokens with default permissions and gate checks', () => {
    const events: unknown[] = [];
    eventBus.subscribe('*', (event) => events.push(event));

    const token = registry.issue({
      holder: 'alice',
      type: 'membership',
      metadata: { source: 'genesis' },
    }, 'dao', 5);

    expect(token?.tokenId).toBe('sbt_1');
    expect(token?.expirationStep).toBe(15);
    expect(registry.canPerformAction('alice', 'vote', 14)).toBe(true);
    expect(registry.canPerformAction('alice', 'vote', 15)).toBe(false);
    expect(registry.checkGate('alice', 'membership', 14)).toEqual({ passed: true });
    expect(registry.checkGate('alice', 'membership', 15).passed).toBe(false);
    expect(events.map((event) => (event as { event: string }).event)).toEqual(['sbt_issued']);
  });

  it('enforces holder limits using active tokens only', () => {
    expect(registry.issue({ holder: 'alice', type: 'membership' }, 'dao', 0)).not.toBeNull();
    expect(registry.issue({ holder: 'alice', type: 'steward' }, 'dao', 0)).not.toBeNull();
    expect(registry.issue({ holder: 'alice', type: 'expert' }, 'dao', 0)).toBeNull();

    const afterExpiry = registry.issue({ holder: 'alice', type: 'expert' }, 'dao', 11);

    expect(afterExpiry?.tokenId).toBe('sbt_3');
    expect(registry.getHolderTokens('alice', 11)).toHaveLength(1);
    expect(registry.getStats(11)).toMatchObject({
      totalIssued: 3,
      totalActive: 1,
      totalExpired: 2,
      holderCount: 1,
    });
  });

  it('revokes with issuer or allowed self-revoke and reports indexes', () => {
    const token = registry.issue({
      holder: 'alice',
      type: 'badgeholder',
      permissions: ['submit_retropgf', 'allocate_funds'],
      durationSteps: 100,
    }, 'dao', 0);

    expect(registry.checkGateWithPermission('alice', 'badgeholder', 'allocate_funds', 10)).toEqual({ passed: true });
    expect(registry.checkGateWithPermission('alice', 'badgeholder', 'vote', 10).passed).toBe(false);
    expect(registry.revoke(token!.tokenId, 'alice', 'left dao', 20)).toBe(false);
    expect(registry.revoke(token!.tokenId, 'dao', 'rotated cohort', 20)).toBe(true);
    expect(registry.getTokensByType('badgeholder', false)).toHaveLength(1);
    expect(registry.getHoldersByType('badgeholder', 21)).toEqual([]);

    const selfRevokeRegistry = new SoulboundTokenRegistry({ allowSelfRevoke: true });
    const selfRevoked = selfRevokeRegistry.issue({ holder: 'bob', type: 'custom' }, 'dao', 0);
    expect(selfRevokeRegistry.revoke(selfRevoked!.tokenId, 'bob', 'opt-out', 1)).toBe(true);
  });

  it('round-trips and ignores malformed serialized SBT state', () => {
    const token = registry.issue({ holder: 'alice', type: 'council' }, 'dao', 0);
    const restored = SoulboundTokenRegistry.fromDict(registry.toDict());

    expect(restored.getToken(token!.tokenId)?.type).toBe('council');
    expect(restored.canPerformAction('alice', 'veto', 1)).toBe(true);
    expect(SoulboundTokenRegistry.fromDict({ tokens: [['bad-token', null]] }).getStats().totalIssued).toBe(0);
    expect(createOptimismSBTRegistry().config.maxTokensPerHolder).toBe(5);
  });
});

describe('InterDAOProposal', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
  });

  it('records weighted votes once per DAO member and finalizes approved proposals', () => {
    const events: unknown[] = [];
    eventBus.subscribe('*', (event) => events.push(event));
    const proposal = InterDAOProposal.createCollaboration(
      'inter_1',
      'Shared research pod',
      'Fund a cross-DAO research pod',
      'dao_a',
      'alice',
      ['dao_a', 'dao_b'],
      10,
      1000,
      { dao_a: 0.6, dao_b: 0.4 },
      eventBus
    );

    proposal.eligibleVotersSnapshot.set('dao_a', 4);
    proposal.setEligibleVoters('dao_a', 100);
    proposal.setEligibleVoters('dao_b', 2);

    expect(proposal.vote('dao_a', 'alice', true, 2, 11)).toBe(true);
    expect(proposal.vote('dao_a', 'alice', false, 1, 12)).toBe(false);
    expect(proposal.vote('dao_x', 'mallory', true, 1, 12)).toBe(false);
    expect(proposal.vote('dao_b', 'bob', true, 1, 11)).toBe(true);
    expect(proposal.hasVoted('dao_a', 'alice')).toBe(true);
    expect(proposal.hasConsidered('dao_a', 'alice')).toBe(true);

    proposal.finalizeDAOVote('dao_a', 0.5, 0.5);
    proposal.finalizeDAOVote('dao_b', 0.5, 0.5);
    proposal.finalize(20);

    expect(proposal.status).toBe('approved');
    expect(proposal.execute(21)).toBe(true);
    expect(proposal.vote('dao_b', 'carol', true, 1, 22)).toBe(false);
    expect(proposal.getVotingSummary()).toMatchObject({
      totalVotesFor: 3,
      totalVotesAgainst: 0,
      approvedCount: 2,
      isPending: false,
    });
    expect(events.map((event) => (event as { event: string }).event)).toEqual(
      expect.arrayContaining([
        'inter_dao_vote',
        'inter_dao_proposal_finalized',
        'inter_dao_proposal_executed',
      ])
    );
  });

  it('rejects proposals when quorum or required approvals fail', () => {
    const proposal = new InterDAOProposal(
      'inter_2',
      'Treaty',
      'Ratify operating treaty',
      'treaty',
      'dao_a',
      'alice',
      ['dao_a', 'dao_b'],
      0,
      20
    );
    proposal.requiredApprovalCount = 2;
    proposal.setEligibleVoters('dao_a', 10);
    proposal.setEligibleVoters('dao_b', 2);
    proposal.vote('dao_a', 'alice', true, 1, 1);
    proposal.vote('dao_b', 'bob', false, 1, 1);

    proposal.finalizeDAOVote('dao_a', 0.5, 0.5);
    proposal.finalizeDAOVote('dao_b', 0.5, 0.5);
    proposal.finalize(21);

    expect(proposal.status).toBe('rejected');
    expect(proposal.execute(22)).toBe(false);
    expect(proposal.isVotingEnded(20)).toBe(true);
  });

  it('creates typed inter-DAO proposal variants', () => {
    const treaty = InterDAOProposal.createTreaty('treaty_1', 'Treaty', 'Desc', 'dao_a', 'alice', ['dao_a'], 1);
    const resource = InterDAOProposal.createResourceSharing(
      'resource_1',
      'Share auditors',
      'Desc',
      'dao_a',
      'alice',
      ['dao_a', 'dao_b'],
      1,
      'auditors',
      3
    );
    const venture = InterDAOProposal.createJointVenture(
      'venture_1',
      'Launch studio',
      'Desc',
      'dao_a',
      'alice',
      ['dao_a', 'dao_b'],
      1,
      5000,
      { dao_a: 0.5, dao_b: 0.5 }
    );

    expect(treaty.votingPeriod).toBe(150);
    expect(resource.getState()).toMatchObject({ proposalType: 'resource_sharing', resourceAmount: 3 });
    expect(venture.getState()).toMatchObject({ proposalType: 'joint_venture', sharedBudget: 5000 });
  });
});

describe('SubDAOController', () => {
  let controller: SubDAOController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new SubDAOController({
      maxSubDaosPerParent: 2,
      minMembersToCreate: 2,
      maxFundingRequestAmount: 1000,
      fundingApprovalSteps: 5,
      vetoWindowSteps: 2,
      allowNestedSubDaos: false,
    });
    controller.setEventBus(eventBus);
  });

  it('validates creation limits, adds creator admin, and blocks nested sub-DAOs', () => {
    expect(controller.createSubDAO({
      name: 'Too small',
      parentDaoId: 'parent',
      creator: 'alice',
      initialMembers: [{ memberId: 'alice', role: 'admin' }],
      governanceScope: 'full',
      autonomyLevel: 'medium',
    }, 0)).toBeNull();

    const subDao = controller.createSubDAO({
      name: 'Growth pod',
      parentDaoId: 'parent',
      creator: 'alice',
      initialMembers: [
        { memberId: 'bob', role: 'member' },
        { memberId: 'carol', role: 'member' },
      ],
      governanceScope: 'limited',
      autonomyLevel: 'medium',
      allowedActions: ['spend'],
    }, 1);

    expect(subDao?.members.find((member) => member.memberId === 'alice')?.role).toBe('admin');
    expect(controller.getSubDAOsForParent('parent')).toHaveLength(1);
    expect(controller.getSubDAOsForMember('alice')).toHaveLength(1);
    expect(controller.createSubDAO({
      name: 'Nested pod',
      parentDaoId: subDao!.subDaoId,
      creator: 'alice',
      initialMembers: [
        { memberId: 'alice', role: 'admin' },
        { memberId: 'bob', role: 'member' },
      ],
      governanceScope: 'full',
      autonomyLevel: 'low',
    }, 2)).toBeNull();
  });

  it('requests, approves, rejects, and times out funding', () => {
    const subDao = createSubDao(controller);

    expect(controller.requestFunding(subDao.subDaoId, 2000, 'DAO', 'too much', 'alice', 2)).toBeNull();
    expect(controller.requestFunding(subDao.subDaoId, 100, 'DAO', 'observer cannot request', 'observer', 2)).toBeNull();
    expect(controller.addMember(subDao.subDaoId, 'observer', 'observer', 2)).toBe(true);
    expect(controller.requestFunding(subDao.subDaoId, 100, 'DAO', 'observer cannot request', 'observer', 3)).toBeNull();

    const approved = controller.requestFunding(subDao.subDaoId, 500, 'DAO', 'budget', 'alice', 3);
    const rejected = controller.requestFunding(subDao.subDaoId, 100, 'DAO', 'extra', 'bob', 3);
    const timedOut = controller.requestFunding(subDao.subDaoId, 50, 'DAO', 'slow', 'bob', 3);

    expect(controller.approveFunding(approved!.requestId, 'parent_admin', 4)).toBe(true);
    expect(controller.getSubDAO(subDao.subDaoId)?.treasury.get('DAO')).toBe(500);
    expect(controller.rejectFunding(rejected!.requestId, 'parent_admin', 'not needed', 4)).toBe(true);
    controller.processSubDAOs(9);

    expect(controller.getPendingFundingRequests('parent')).toEqual([]);
    expect(controller.getStats()).toMatchObject({
      totalFundingRequests: 3,
      approvedFunding: 500,
      pendingFunding: 0,
    });
    expect(controller.approveFunding(timedOut!.requestId, 'parent_admin', 10)).toBe(false);
  });

  it('handles actions, vetoes, membership, dissolution, and restore', () => {
    const subDao = createSubDao(controller);
    const funding = controller.requestFunding(subDao.subDaoId, 500, 'DAO', 'budget', 'alice', 2);
    controller.approveFunding(funding!.requestId, 'parent_admin', 3);

    expect(controller.isActionAllowed(subDao.subDaoId, 'spend')).toBe(true);
    expect(controller.isActionAllowed(subDao.subDaoId, 'mint')).toBe(false);
    expect(controller.parentVeto(subDao.subDaoId, 'proposal_1', 'parent_admin', 'risk', 4)).toBe(true);
    expect(controller.isProposalVetoed(subDao.subDaoId, 'proposal_1')).toBe(true);
    controller.processSubDAOs(5);
    expect(controller.isProposalVetoed(subDao.subDaoId, 'proposal_1')).toBe(false);

    expect(controller.addMember(subDao.subDaoId, 'dave', 'member', 6)).toBe(true);
    expect(controller.addMember(subDao.subDaoId, 'dave', 'member', 7)).toBe(false);
    expect(controller.removeMember(subDao.subDaoId, 'dave', 8)).toBe(true);
    expect(controller.getSubDAOsForMember('dave')).toEqual([]);

    const returned = controller.dissolve(subDao.subDaoId, 'parent_admin', 9);

    expect(returned?.returnedFunds.get('DAO')).toBe(500);
    expect(controller.getSubDAOsForParent('parent')).toHaveLength(0);
    expect(controller.getSubDAOsForParent('parent', false)).toHaveLength(1);

    const restored = SubDAOController.fromDict(controller.toDict());
    expect(restored.getSubDAO(subDao.subDaoId)?.dissolved).toBe(true);
    expect(SubDAOController.fromDict({ subDaos: [['bad-subdao', null]] }).getStats().totalSubDaos).toBe(0);
    expect(createStandardSubDAOController().config.maxFundingRequestAmount).toBe(100000);
  });

  it('respects full, advisory, and high-autonomy behavior', () => {
    const full = controller.createSubDAO({
      name: 'Full pod',
      parentDaoId: 'parent',
      creator: 'alice',
      initialMembers: [
        { memberId: 'alice', role: 'admin' },
        { memberId: 'bob', role: 'member' },
      ],
      governanceScope: 'full',
      autonomyLevel: 'high',
    }, 1);
    const advisory = controller.createSubDAO({
      name: 'Advisory pod',
      parentDaoId: 'parent',
      creator: 'carol',
      initialMembers: [
        { memberId: 'carol', role: 'admin' },
        { memberId: 'dave', role: 'member' },
      ],
      governanceScope: 'advisory',
      autonomyLevel: 'low',
    }, 2);

    expect(controller.isActionAllowed(full!.subDaoId, 'anything')).toBe(true);
    expect(controller.parentVeto(full!.subDaoId, 'proposal_1', 'parent_admin', 'risk', 3)).toBe(false);
    expect(controller.isActionAllowed(advisory!.subDaoId, 'anything')).toBe(false);
    expect(controller.createSubDAO({
      name: 'Over limit',
      parentDaoId: 'parent',
      creator: 'erin',
      initialMembers: [
        { memberId: 'erin', role: 'admin' },
        { memberId: 'frank', role: 'member' },
      ],
      governanceScope: 'full',
      autonomyLevel: 'medium',
    }, 3)).toBeNull();
  });
});

function createSubDao(controller: SubDAOController) {
  const subDao = controller.createSubDAO({
    name: 'Growth pod',
    parentDaoId: 'parent',
    creator: 'alice',
    initialMembers: [
      { memberId: 'alice', role: 'admin' },
      { memberId: 'bob', role: 'member' },
    ],
    governanceScope: 'limited',
    autonomyLevel: 'medium',
    allowedActions: ['spend'],
  }, 1);

  if (!subDao) {
    throw new Error('Expected sub-DAO fixture to be created');
  }

  return subDao;
}
