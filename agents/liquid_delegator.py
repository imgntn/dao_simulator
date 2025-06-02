import random
from agents.delegator import Delegator


class LiquidDelegator(Delegator):
    """Delegates voting power to a representative who votes on their behalf."""

    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy=None,
        delegation_budget=100,
    ):
        super().__init__(
            unique_id,
            model,
            tokens,
            reputation,
            location,
            voting_strategy,
            delegation_budget,
        )
        self.representative = None

    def choose_representative(self):
        candidates = [m for m in self.model.members if m is not self]
        return random.choice(candidates) if candidates else None

    def delegate_to_member(self, member):
        if self.representative and hasattr(self.representative, "delegates"):
            if self in self.representative.delegates:
                self.representative.delegates.remove(self)
        self.representative = member
        if not hasattr(member, "delegates"):
            member.delegates = []
        member.delegates.append(self)

    def step(self):
        if self.representative is None:
            rep = self.choose_representative()
            if rep:
                self.delegate_to_member(rep)
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def receive_representative_vote(self, proposal, vote_bool, weight=1):
        proposal.add_vote(self, vote_bool, weight)
        self.votes[proposal] = {"vote": vote_bool, "weight": weight}
