import random
from mesa import Agent


class DefaultVotingStrategy:
    def vote(self, member, proposal):
        vote_decision = member.decide_vote(proposal.topic)
        member.votes[proposal] = vote_decision


class DAOMember(Agent):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy=None,
    ):
        super().__init__(unique_id, model)
        self.tokens = tokens
        self.reputation = reputation
        self.location = location
        self.voting_strategy = (
            voting_strategy if voting_strategy else DefaultVotingStrategy()
        )
        self.comments = {}
        self.votes = {}

    def vote_on_proposal(self, proposal):
        self.voting_strategy.vote(self, proposal)

    def leave_comment(self, proposal, sentiment):
        self.comments[proposal] = sentiment
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

    def receive_revenue_share(self, amount):
        self.tokens += amount

    def decide_vote(self, topic):
        if topic == "Topic A":
            return "yes" if self.reputation > 50 else "no"
        elif topic == "Topic B":
            return "yes" if self.tokens > 200 else "no"
        elif topic == "Topic C":
            return "yes" if self.location == "USA" else "no"
