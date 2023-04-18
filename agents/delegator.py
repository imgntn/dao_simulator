import random
from agents.dao_member import DAOMember


class Delegator(DAOMember):
    def __init__(
        self, unique_id, model, tokens, reputation, location, delegation_budget
    ):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.delegation_budget = delegation_budget

    def step(self):
        self.delegate_support_to_proposal()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def delegate_support_to_proposal(self):
        if self.delegation_budget > 0:
            proposal = self.choose_proposal_to_delegate_to()
            if proposal is not None:
                delegation_amount = random.uniform(0, self.delegation_budget)
                self.delegation_budget -= delegation_amount
                proposal.receive_delegated_support(self, delegation_amount)

    def choose_proposal_to_delegate_to(self):
        open_proposals = [p for p in self.model.proposals if not p.closed]
        if open_proposals:
            proposal = random.choice(open_proposals)
            return proposal
        else:
            return None
