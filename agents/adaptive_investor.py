from __future__ import annotations

import random
from agents.investor import Investor

class AdaptiveInvestor(Investor):
    """Investor that learns which proposal types yield better returns."""

    def __init__(self, *args, learning_rate=0.1, epsilon=0.1, **kwargs):
        super().__init__(*args, **kwargs)
        self.learning_rate = learning_rate
        self.epsilon = epsilon
        self.q_table: dict[str, float] = {}
        self.last_price: float | None = None

    def choose_proposal(self):
        open_props = [p for p in self.model.proposals if not p.closed]
        if not open_props:
            return None
        if random.random() < self.epsilon:
            return random.choice(open_props)
        return max(open_props, key=lambda p: self.q_table.get(getattr(p, "type", ""), 0))

    def invest_in_random_proposal(self):
        proposal = self.choose_proposal()
        if proposal and self.investment_budget > 0:
            amount = random.uniform(0, self.investment_budget)
            proposal.receive_investment(self, amount)
            self.investment_budget -= amount
            self.investments[proposal] = {
                "amount": amount,
                "type": getattr(proposal, "type", ""),
            }
            self.reputation += amount / 100
            self.mark_active()

    def update_q_values(self):
        price = self.model.treasury.get_token_price("DAO_TOKEN")
        if self.last_price is None:
            self.last_price = price
            return
        delta = price - self.last_price
        self.last_price = price
        for prop, info in list(self.investments.items()):
            reward = delta * info["amount"]
            ptype = info["type"]
            old = self.q_table.get(ptype, 0)
            self.q_table[ptype] = old + self.learning_rate * (reward - old)
            if getattr(prop, "status", "open") != "open":
                del self.investments[prop]

    def step(self):
        self.update_q_values()
        super().step()
