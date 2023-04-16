import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal

class Investor(DAOMember):
    def __init__(self, unique_id, model, investment_budget):
        super().__init__(unique_id, model)
        self.investment_budget = investment_budget

    def step(self):
        if random.random() < self.model.investor_investment_probability:
            self.invest()

    def invest(self):
        proposal = self.choose_proposal()
        if proposal is not None:
            self.support_proposal(proposal)

    def choose_proposal(self):
        # Implementation of choosing a proposal based on the potential return on investment
        investment_proposals = [prop for prop in self.model.proposals if prop.proposal_type == "funding"]
        if investment_proposals:
            proposal = max(investment_proposals, key=lambda prop: prop.potential_roi)
            return proposal
        else:
            return None

    def support_proposal(self, proposal):
        # Implementation of supporting a proposal
        investment_amount = min(self.investment_budget, proposal.funding_goal - proposal.current_funding)
        proposal.current_funding += investment_amount
        self.investment_budget -= investment_amount
        if proposal.current_funding >= proposal.funding_goal:
            proposal.funded = True

        # Update the treasury
        dao = self.model.dao
        token = dao.treasury.native_token_name
        self.investment_budget[token] -= investment_amount
        dao.treasury.add_native_tokens(investment_amount)
