import random
from agents.dao_member import DAOMember


class RLTrader(DAOMember):
    """Trader using a simple Q-learning strategy."""

    actions = ("buy", "sell", "add_lp", "remove_lp")

    def __init__(self, unique_id, model, tokens, reputation, location,
                 learning_rate=0.1, discount=0.9, epsilon=0.1, voting_strategy=None):
        super().__init__(unique_id, model, tokens, reputation, location, voting_strategy)
        self.learning_rate = learning_rate
        self.discount = discount
        self.epsilon = epsilon
        self.q = {}
        self.prev_state = None
        self.prev_action = None

    def _state(self):
        price = round(self.model.treasury.get_token_price("DAO_TOKEN"), 2)
        pool = next(iter(self.model.treasury.pools.values()), None)
        depth = 0.0
        if pool:
            depth = pool.reserve_a + pool.reserve_b
        return (price, round(depth, 2))

    def _choose_action(self, state):
        if random.random() < self.epsilon:
            return random.choice(self.actions)
        q_vals = [self.q.get((state, a), 0.0) for a in self.actions]
        return self.actions[q_vals.index(max(q_vals))]

    def _update_q(self, reward, new_state):
        if self.prev_state is None or self.prev_action is None:
            return
        old_q = self.q.get((self.prev_state, self.prev_action), 0.0)
        future = max(self.q.get((new_state, a), 0.0) for a in self.actions)
        self.q[(self.prev_state, self.prev_action)] = old_q + self.learning_rate * (
            reward + self.discount * future - old_q
        )

    def step(self):
        state = self._state()
        action = self._choose_action(state)
        reward = 0.0
        treasury = self.model.treasury
        if action == "buy" and self.tokens > 0:
            amt = min(1, self.tokens)
            treasury.deposit("USDC", amt, step=self.model.current_step)
            out = treasury.swap("USDC", "DAO_TOKEN", amt)
            self.tokens -= amt
            self.tokens += treasury.withdraw("DAO_TOKEN", out, step=self.model.current_step)
            reward = treasury.get_token_price("DAO_TOKEN") * out - amt
        elif action == "sell" and self.tokens > 0:
            amt = min(1, self.tokens)
            treasury.deposit("DAO_TOKEN", amt, step=self.model.current_step)
            out = treasury.swap("DAO_TOKEN", "USDC", amt)
            self.tokens -= amt
            self.tokens += treasury.withdraw("USDC", out, step=self.model.current_step)
            reward = out - treasury.get_token_price("DAO_TOKEN") * amt
        elif action == "add_lp" and self.tokens >= 2:
            treasury.deposit("DAO_TOKEN", 1, step=self.model.current_step)
            treasury.deposit("USDC", 1, step=self.model.current_step)
            treasury.add_liquidity("DAO_TOKEN", "USDC", 1, 1)
            reward = 0.01
        elif action == "remove_lp":
            treasury.remove_liquidity("DAO_TOKEN", "USDC", 0.1)
            reward = -0.01
        self._update_q(reward, state)
        self.prev_state = state
        self.prev_action = action
        self.mark_active()

