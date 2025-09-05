from collections import deque
from agents.dao_member import DAOMember
from utils.proposal_utils import create_random_proposal


class PlayerAgent(DAOMember):
    """Agent controlled via external API calls."""

    def __init__(self, unique_id, model, tokens, reputation, location):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.actions = deque()

    # ------------------------------------------------------------------
    # Helper methods interacting with the DAO treasury

    def _treasury_swap(self, token_in: str, token_out: str, amount: float) -> float:
        treasury = self.model.treasury
        step = getattr(self.model, "current_step", 0)
        treasury.deposit(token_in, amount, step=step)
        try:
            out = treasury.swap(token_in, token_out, amount, step=step)
        except ValueError:
            treasury.withdraw(token_in, amount, step=step)
            return 0.0
        gained = treasury.withdraw(token_out, out, step=step)
        return gained

    def _treasury_add_liquidity(
        self, token_a: str, token_b: str, amt_a: float, amt_b: float
    ) -> None:
        treasury = self.model.treasury
        step = getattr(self.model, "current_step", 0)
        treasury.deposit(token_a, amt_a, step=step)
        treasury.deposit(token_b, amt_b, step=step)
        treasury.add_liquidity(token_a, token_b, amt_a, amt_b, step=step)

    def _treasury_remove_liquidity(
        self, token_a: str, token_b: str, share: float
    ) -> tuple[float, float]:
        treasury = self.model.treasury
        step = getattr(self.model, "current_step", 0)
        amt_a, amt_b = treasury.remove_liquidity(token_a, token_b, share, step=step)
        gained_a = treasury.withdraw(token_a, amt_a, step=step)
        gained_b = treasury.withdraw(token_b, amt_b, step=step)
        return gained_a, gained_b

    def enqueue(self, action: str, **kwargs) -> None:
        """Add an action to the queue."""
        self.actions.append((action, kwargs))

    def step(self) -> None:
        if not self.actions:
            return
        action, kwargs = self.actions.popleft()
        if action == "vote":
            proposal = kwargs.get("proposal")
            vote = kwargs.get("vote", True)
            if proposal is not None:
                proposal.add_vote(self, vote)
                self.votes[proposal] = {"vote": vote, "weight": 1}
                self.mark_active()
        elif action == "comment":
            proposal = kwargs.get("proposal")
            sentiment = kwargs.get("sentiment", "neutral")
            if proposal is not None:
                self.leave_comment(proposal, sentiment)
        elif action == "create_proposal":
            proposal = create_random_proposal(self.model, self)
            self.model.add_proposal(proposal)
            self.mark_active()
        elif action == "delegate":
            proposal = kwargs.get("proposal")
            amount = kwargs.get("amount", 0)
            if proposal is not None and amount > 0 and self.tokens >= amount:
                self.tokens -= amount
                proposal.receive_delegated_support(self, amount)
                self.mark_active()
        elif action == "swap":
            token_in = kwargs.get("token_in")
            token_out = kwargs.get("token_out")
            amount = kwargs.get("amount", 0.0)
            if token_in and token_out and amount > 0 and self.tokens >= amount:
                gained = self._treasury_swap(token_in, token_out, amount)
                self.tokens -= amount
                self.tokens += gained
                self.mark_active()
        elif action == "add_liquidity":
            token_a = kwargs.get("token_a")
            token_b = kwargs.get("token_b")
            amt_a = kwargs.get("amount_a", 0.0)
            amt_b = kwargs.get("amount_b", 0.0)
            total = amt_a + amt_b
            if token_a and token_b and total > 0 and self.tokens >= total:
                self._treasury_add_liquidity(token_a, token_b, amt_a, amt_b)
                self.tokens -= total
                self.mark_active()
        elif action == "remove_liquidity":
            token_a = kwargs.get("token_a")
            token_b = kwargs.get("token_b")
            share = kwargs.get("share", 0.0)
            if token_a and token_b and 0 < share <= 1:
                amt_a, amt_b = self._treasury_remove_liquidity(token_a, token_b, share)
                self.tokens += amt_a + amt_b
                self.mark_active()
        else:
            # unknown action - ignore
            pass
