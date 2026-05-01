import { describe, expect, it } from 'vitest';
import { DAO } from '../lib/data-structures/dao';
import {
  createMultiStageProposal,
  MultiStageProposal,
  type HouseVoteResult,
  type StageConfig,
} from '../lib/data-structures/multi-stage-proposal';

describe('MultiStageProposal lifecycle invariants', () => {
  it('sanitizes malformed stage configs at construction and factory creation', () => {
    const dao = new DAO('Multi DAO');
    dao.currentStep = 10;
    const malformedStages = [
      { stage: 'rfc', durationSteps: -5 },
      { stage: 'not_a_stage', durationSteps: 100 },
      { stage: 'on_chain', durationSteps: Number.NaN },
    ] as unknown as StageConfig[];

    const proposal = new MultiStageProposal(
      dao,
      'creator',
      'Lifecycle',
      'desc',
      Number.NaN,
      -1,
      'governance',
      null,
      malformedStages
    );

    expect(proposal.stageConfigs).toEqual([
      { stage: 'rfc', durationSteps: 0 },
      { stage: 'on_chain', durationSteps: 0 },
    ]);
    expect(proposal.currentStageState).toMatchObject({
      stage: 'rfc',
      startStep: 10,
      endStep: 10,
      passed: null,
    });

    const created = createMultiStageProposal(
      dao,
      'creator',
      'Factory',
      'desc',
      10,
      malformedStages,
      'invalid' as unknown as 'standard',
      true
    );

    expect(created.duration).toBe(0);
    expect(created.proposalCategory).toBe('standard');
    expect(created.requiresBicameral).toBe(true);
  });

  it('counts house votes only when the underlying proposal vote is accepted', () => {
    const dao = new DAO('Multi DAO');
    const proposal = new MultiStageProposal(dao, 'creator', 'House votes', 'desc', 0, 10);

    expect(proposal.addVoteForHouse('alice', true, Number.NaN)).toBe(false);
    expect(proposal.addVoteForHouse('alice', true, 1, 'bad_house' as unknown as 'token_house')).toBe(false);
    expect(proposal.addVoteForHouse('alice', true, 2, 'token_house')).toBe(true);
    expect(proposal.addVoteForHouse('alice', false, 2, 'citizens_house')).toBe(false);

    expect(proposal.votesFor).toBe(2);
    expect(proposal.houseVotes.get('token_house')).toMatchObject({
      votesFor: 2,
      votesAgainst: 0,
    });
    expect(proposal.houseVotes.has('citizens_house')).toBe(false);
  });

  it('ignores invalid veto signals and clamps dynamic timelock calculations', () => {
    const dao = new DAO('Multi DAO');
    const proposal = new MultiStageProposal(dao, 'creator', 'Veto', 'desc', 0, 10);

    proposal.signalVeto('alice', Number.NaN);
    proposal.signalVeto('alice', -10);
    proposal.signalVeto('alice', 25);
    proposal.signalVeto('alice', 5);

    expect(proposal.vetoSignals.get('alice')).toBe(30);
    expect(proposal.totalVetoSignal).toBe(30);
    expect(proposal.isVetoThresholdReached(Number.NaN)).toBe(false);
    expect(proposal.isVetoThresholdReached(1000)).toBe(true);
    expect(proposal.calculateDynamicTimelock(Number.NaN, 5, 20)).toBe(5);
    expect(proposal.calculateDynamicTimelock(1000, -5, 20)).toBe(20);

    proposal.vetoThresholdPercent = 0;
    expect(proposal.isVetoThresholdReached(1000)).toBe(false);
    expect(proposal.calculateDynamicTimelock(1000, 5, 20)).toBe(5);
  });

  it('prevents stage advancement after closure and clamps timelock scheduling', () => {
    const dao = new DAO('Multi DAO');
    dao.currentStep = 4;
    const proposal = new MultiStageProposal(dao, 'creator', 'Stages', 'desc', 0, 10, 'governance', null, [
      { stage: 'temp_check', durationSteps: 1 },
      { stage: 'on_chain', durationSteps: 1 },
    ]);

    expect(proposal.advanceToNextStage(false, 'failed temp check')).toBe(false);
    expect(proposal.status).toBe('rejected');
    expect(proposal.advanceToNextStage(true)).toBe(false);
    expect(proposal.currentStageIndex).toBe(0);

    proposal.scheduleTimelock(Number.NaN);
    expect(proposal.timelockScheduledStep).toBe(4);
    expect(proposal.timelockExecutionStep).toBe(4);
  });

  it('sanitizes restored stage, house, veto, and timelock state', () => {
    const dao = new DAO('Multi DAO');
    const restored = MultiStageProposal.fromDict({
      status: 'bad_status',
      fundingGoal: Number.NaN,
      duration: -10,
      stageConfigs: [
        { stage: 'bad_stage', durationSteps: 99 },
        { stage: 'veto_window', durationSteps: -5 },
      ],
      stageStates: [
        { stage: 'bad_stage', startStep: 1, endStep: 2, passed: true },
        { stage: 'veto_window', startStep: 10, endStep: 5, passed: 'maybe' },
      ],
      currentStageIndex: 99,
      proposalCategory: 'bad_category',
      votesFor: Number.POSITIVE_INFINITY,
      votesAgainst: -5,
      votesAbstain: 2,
      currentFunding: Number.NaN,
      totalVetoSignal: Number.POSITIVE_INFINITY,
      vetoThresholdPercent: -1,
      dynamicTimelockExtension: Number.NaN,
      timelockScheduledStep: -5,
      timelockExecutionStep: Number.NaN,
      houseVotes: {
        token_house: {
          votesFor: 10,
          votesAgainst: Number.NaN,
          quorumMet: true,
          approved: true,
        } satisfies Partial<HouseVoteResult>,
        bad_house: {
          votesFor: 100,
        },
      },
      vetoSignals: {
        alice: 5,
        bob: Number.NaN,
        carol: -10,
      },
      snapshotTaken: true,
      votingPowerSnapshot: {
        alice: Number.NaN,
      },
    }, dao);

    expect(restored.status).toBe('open');
    expect(restored.stageConfigs).toEqual([{ stage: 'veto_window', durationSteps: 0 }]);
    expect(restored.stageStates).toEqual([
      { stage: 'veto_window', startStep: 10, endStep: 10, passed: null, reason: undefined, details: undefined },
    ]);
    expect(restored.currentStageIndex).toBe(1);
    expect(restored.proposalCategory).toBe('standard');
    expect(restored.votesFor).toBe(0);
    expect(restored.votesAgainst).toBe(0);
    expect(restored.votesAbstain).toBe(2);
    expect(restored.currentFunding).toBe(0);
    expect(restored.vetoThresholdPercent).toBe(1);
    expect(restored.dynamicTimelockExtension).toBe(0);
    expect(restored.timelockScheduledStep).toBe(0);
    expect(restored.timelockExecutionStep).toBe(0);
    expect(restored.houseVotes.get('token_house')).toMatchObject({
      votesFor: 10,
      votesAgainst: 0,
      quorumMet: true,
      approved: true,
    });
    expect(restored.houseVotes.has('bad_house' as 'token_house')).toBe(false);
    expect(restored.vetoSignals).toEqual(new Map([
      ['alice', 5],
      ['bob', 0],
      ['carol', 0],
    ]));
    expect(restored.totalVetoSignal).toBe(5);
  });
});
