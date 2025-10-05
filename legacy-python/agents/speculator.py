import random
from agents.dao_member import DAOMember


class Speculator(DAOMember):
    """Agent that participates in the prediction market."""

    def step(self) -> None:
        self.create_random_prediction()
        self.bet_on_prediction()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def create_random_prediction(self) -> None:
        proposals = [p for p in self.model.proposals if p.status == "open"]
        if not proposals or random.random() > 0.1:
            return
        proposal = random.choice(proposals)
        question = f"Will '{proposal.title}' pass?"
        resolve_step = proposal.creation_time + proposal.voting_period
        self.model.prediction_market.create_prediction(
            question, resolve_step, target=proposal
        )

    def bet_on_prediction(self) -> None:
        if not self.model.prediction_market.predictions:
            return
        prediction = random.choice(self.model.prediction_market.predictions)
        choice = random.choice(["pass", "fail"])
        amount = min(self.tokens, random.uniform(1, 5))
        if amount <= 0:
            return
        placed = self.model.prediction_market.place_bet(
            self, prediction, choice, amount
        )
        if placed:
            self.mark_active()
