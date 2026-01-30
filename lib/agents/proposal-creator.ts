// Proposal Creator Agent

import { DAOMember } from './base';
import { createRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice, randomInt, weightedRandomChoice } from '../utils/random';
import type { TopicConfig } from '../data-structures/dao';

const DEFAULT_TOPIC_CONFIG: TopicConfig[] = [
  { topic: 'Funding', weight: 1, fundingRange: [0.005, 0.05] },
  { topic: 'Governance', weight: 1, fundingRange: [0.0, 0.01] },
  { topic: 'Marketing', weight: 1, fundingRange: [0.005, 0.03] },
  { topic: 'Development', weight: 1, fundingRange: [0.01, 0.05] },
  { topic: 'Community', weight: 1, fundingRange: [0.005, 0.02] },
  { topic: 'Infrastructure', weight: 1, fundingRange: [0.01, 0.05] },
];

export class ProposalCreator extends DAOMember {
  step(): void {
    const creationProbability =
      (this.model as any).proposalCreationProbability ?? 0.005;
    if (random() < creationProbability) {
      this.createRandomProposal();
    }

    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  createRandomProposal(): void {
    if (!this.model.dao) return;

    const topicConfig = this.model.dao.proposalTopicConfig || DEFAULT_TOPIC_CONFIG;
    const selected = weightedRandomChoice(topicConfig);
    const topic = selected.topic;

    const titlePrefix = `${topic} Proposal`;
    const fixedDuration = (this.model as any).proposalDurationSteps ?? 0;
    const minDuration = (this.model as any).proposalDurationMinSteps ?? 10;
    const maxDuration = (this.model as any).proposalDurationMaxSteps ?? 30;

    const duration =
      fixedDuration && fixedDuration > 0
        ? fixedDuration
        : randomInt(Math.min(minDuration, maxDuration), Math.max(minDuration, maxDuration));

    const proposal = createRandomProposal(this.model.dao, this, titlePrefix, topic, null, duration, selected.fundingRange);
    proposal.description = `A proposal about ${topic.toLowerCase()}`;

    this.model.dao.addProposal(proposal);
    this.markActive();
  }
}
