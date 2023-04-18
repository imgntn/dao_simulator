import random
from mesa import Agent


class DAOMember(Agent):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy):
        super().__init__(unique_id, model)
        self.tokens = tokens
        self.reputation = reputation
        self.location = location
        self.voting_strategy = voting_strategy

    def vote_on_proposal(self, proposal):
        self.voting_strategy.vote(self, proposal)

    def leave_comment(self, proposal, sentiment):
        proposal.add_comment(self, sentiment)

    def vote_on_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            self.vote_on_proposal(proposal)

    def leave_comment_on_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            sentiment = random.choice(["positive", "negative", "neutral"])
            self.leave_comment(proposal, sentiment)
