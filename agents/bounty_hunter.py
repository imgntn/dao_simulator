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
            if isinstance(p, BountyProposal)
            and p.status == "approved"
            and p.reward_locked
            and not p.completed
        ]
        if not bounties:
            return
        bounty = random.choice(bounties)
        bounty.completed = True
        reward = self.model.treasury.withdraw_locked("DAO_TOKEN", bounty.reward)
        self.tokens += reward
        if self.model.event_bus:
            self.model.event_bus.publish(
                "bounty_completed",
                step=self.model.current_step,
                proposal=bounty.title,
                hunter=self.unique_id,
                reward=reward,
            )
        self.mark_active()

