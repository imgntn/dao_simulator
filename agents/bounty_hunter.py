import random
from agents.dao_member import DAOMember
from data_structures import BountyProposal


class BountyHunter(DAOMember):
    """Agent that works on open bounty proposals."""

    def step(self):
        self.work_on_bounties()
        self.vote_on_random_proposal()

    def work_on_bounties(self):
        bounties = [
            p
            for p in self.model.proposals
            if isinstance(p, BountyProposal) and p.status == "approved" and not p.completed
        ]
        if not bounties:
            return
        bounty = random.choice(bounties)
        bounty.completed = True
        self.model.treasury.withdraw("DAO_TOKEN", bounty.reward)
        self.tokens += bounty.reward
        self.mark_active()

