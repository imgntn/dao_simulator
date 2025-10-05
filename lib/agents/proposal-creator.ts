// Proposal Creator Agent

import { DAOMember } from './base';
import type { DAOSimulation } from '../simulation';
import { Proposal } from '../data-structures/proposal';

export class ProposalCreator extends DAOMember {
  step(): void {
    if (Math.random() < 0.3) {
      this.createRandomProposal();
    }

    this.voteOnRandomProposal();

    if (Math.random() < (this.model.dao?.commentProbability || 0.5)) {
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
    const topic = topics[Math.floor(Math.random() * topics.length)];

    const title = `${topic} Proposal ${Math.floor(Math.random() * 1000)}`;
    const description = `A proposal about ${topic.toLowerCase()}`;
    const fundingGoal = Math.random() * 1000 + 100;
    const duration = Math.floor(Math.random() * 20) + 10;

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
