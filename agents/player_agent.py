from collections import deque
from agents.dao_member import DAOMember
from utils.proposal_utils import create_random_proposal


class PlayerAgent(DAOMember):
    """Agent controlled via external API calls."""

    def __init__(self, unique_id, model, tokens, reputation, location):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.actions = deque()

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
        else:
            # unknown action - ignore
            pass
