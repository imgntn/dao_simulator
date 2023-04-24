import random
from agents.dao_member import DAOMember


class Delegator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
        delegation_budget=1000,  # TODO: fix this magic number
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.delegation_budget = delegation_budget
        self.delegations = {}

    def step(self):
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def delegate_support_to_proposal(self, proposal, token_amount):
        if self.delegation_budget >= token_amount:
            self.delegation_budget -= token_amount
            proposal.receive_delegated_support(self, token_amount)
            self.delegations[proposal] = token_amount

    def choose_proposal_to_delegate_to(self):
        open_proposals = [p for p in self.model.proposals if not p.closed]
        if open_proposals:
            proposal = random.choice(open_proposals)
            return proposal
        else:
            return None
