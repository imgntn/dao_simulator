// Proposal Creator Agent

import { DAOMember } from './base';
import { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomInt } from '../utils/random';

export class ProposalCreator extends DAOMember {
  step(): void {
    if (random() < 0.3) {
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

    const title = `${topic} Proposal ${randomInt(0, 999)}`;
    const description = `A proposal about ${topic.toLowerCase()}`;
    const fundingGoal = random() * 1000 + 100;
    const duration = randomInt(10, 30);

    const proposal = new Proposal(
      this.model.dao,
      this.uniqueId,
      title,
      description,
      fundingGoal,
      duration,
      topic
    );

    this.model.dao.addProposal(proposal);
    this.markActive();
  }
}
