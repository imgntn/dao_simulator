// Passive Member Agent - only votes

import { DAOMember } from './base';

export class PassiveMember extends DAOMember {
  step(): void {
    this.voteOnRandomProposal();
  }
}
