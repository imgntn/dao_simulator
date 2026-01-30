// Proposal Creator Agent

import { DAOMember } from './base';
import { createRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice, randomInt } from '../utils/random';

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

    const topics = [
      'Funding',
      'Governance',
      'Marketing',
      'Development',
      'Community',
      'Infrastructure',
    ];
    const topic = randomChoice(topics);

    const titlePrefix = `${topic} Proposal`;
    const fixedDuration = (this.model as any).proposalDurationSteps ?? 0;
    const minDuration = (this.model as any).proposalDurationMinSteps ?? 10;
    const maxDuration = (this.model as any).proposalDurationMaxSteps ?? 30;

    const duration =
      fixedDuration && fixedDuration > 0
        ? fixedDuration
        : randomInt(Math.min(minDuration, maxDuration), Math.max(minDuration, maxDuration));

    const proposal = createRandomProposal(this.model.dao, this, titlePrefix, topic, null, duration);
    proposal.description = `A proposal about ${topic.toLowerCase()}`;

    this.model.dao.addProposal(proposal);
    this.markActive();
  }
}
