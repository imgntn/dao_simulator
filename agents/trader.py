import random
from agents.dao_member import DAOMember


class Trader(DAOMember):
    """Agent that swaps tokens in the DAO treasury."""

    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy=None):
        super().__init__(unique_id, model, tokens, reputation, location, voting_strategy)
        self.last_price = model.treasury.get_token_price("DAO_TOKEN")

    def step(self):
        treasury = self.model.treasury
        if not treasury.pools:
            return
        price = treasury.get_token_price("DAO_TOKEN")
        pool_key = random.choice(list(treasury.pools.keys()))
        token_a, token_b = pool_key
        if "DAO_TOKEN" in pool_key:
            other = token_b if token_a == "DAO_TOKEN" else token_a
            if price > self.last_price or getattr(self.model, "current_shock", 0) > 0:
                sell, buy = other, "DAO_TOKEN"
            else:
                sell, buy = "DAO_TOKEN", other
        else:
            sell, buy = token_a, token_b
            if random.random() < 0.5:
                sell, buy = buy, sell
        amount = min(self.tokens, 1)
        if amount <= 0:
            self.last_price = price
            return
        treasury.deposit(sell, amount, step=self.model.current_step)
        try:
            out = treasury.swap(sell, buy, amount, step=self.model.current_step)
        except ValueError:
            treasury.withdraw(sell, amount, step=self.model.current_step)
            self.last_price = price
            return
        gained = treasury.withdraw(buy, out, step=self.model.current_step)
        self.tokens -= amount
        self.tokens += gained
        self.last_price = price
        self.mark_active()
