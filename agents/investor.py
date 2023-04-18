import random
from agents.dao_member import DAOMember


class Investor(DAOMember):
    def __init__(
        self, unique_id, model, tokens, reputation, location, investment_budget
    ):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.investment_budget = investment_budget

    def step(self):
        self.invest_in_random_proposal()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def invest_in_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            if self.investment_budget > 0:
                investment_amount = random.uniform(0, self.investment_budget)
                proposal.receive_investment(self, investment_amount)
                self.investment_budget -= investment_amount
