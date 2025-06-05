import random
from agents.dao_member import DAOMember


class Investor(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy=None,
        investment_budget=100,
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.investment_budget = investment_budget
        self.investments = {}

    def step(self):
        self.adjust_budget_based_on_price()
        self.invest_in_random_proposal()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def invest_in_project(self, project, investment_amount):
        if self.investment_budget >= investment_amount:
            self.investments[project] = investment_amount
            self.investment_budget -= investment_amount

    def invest_in_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            if self.investment_budget > 0:
                investment_amount = random.uniform(0, self.investment_budget)
                proposal.receive_investment(self, investment_amount)
                self.investment_budget -= investment_amount
                self.reputation += investment_amount / 100
                self.mark_active()
                if self.model.event_bus:
                    self.model.event_bus.publish(
                        "proposal_invested",
                        step=self.model.current_step,
                        proposal=getattr(proposal, "title", None),
                        investor=self.unique_id,
                        amount=investment_amount,
                    )

    def adjust_budget_based_on_price(self):
        """Increase or decrease investment budget based on DAO token price."""
        try:
            price = self.model.treasury.get_token_price("DAO_TOKEN")
        except KeyError:
            price = 1.0
        shock = getattr(self.model, "current_shock", 0)
        if shock:
            self.investment_budget *= 1 + shock
        elif price < 1:
            self.investment_budget *= 1.1
        else:
            self.investment_budget *= 0.9

    def to_dict(self):
        data = super().to_dict()
        data["investment_budget"] = self.investment_budget
        return data
