import random
from utils.voting_strategies import quadratic_vote, register_strategy, get_strategy


class Agent:
    """Minimal stand-in for ``mesa.Agent`` used in tests."""

    def __init__(self, unique_id, model):
        self.unique_id = unique_id
        self.model = model


class DefaultVotingStrategy:
    def vote(self, member, proposal):
        vote_decision = member.decide_vote(proposal.topic)
        vote_bool = vote_decision == "yes"
        member.votes[proposal] = {"vote": vote_bool, "weight": 1}
        proposal.add_vote(member, vote_bool)


class QuadraticVotingStrategy:
    """Voting strategy where casting ``n`` votes costs ``n`` squared tokens."""

    def __init__(self, max_cost: int = 4):
        self.max_cost = max_cost

    def vote(self, member, proposal):
        available = min(member.tokens, self.max_cost)
        weight = quadratic_vote(proposal, available)
        if weight <= 0:
            return
        cost = weight ** 2
        member.tokens -= cost
        vote_bool = member.decide_vote(proposal.topic) == "yes"
        member.votes[proposal] = {"vote": vote_bool, "weight": weight}
        proposal.add_vote(member, vote_bool, weight)


register_strategy("default", DefaultVotingStrategy)
register_strategy("quadratic", QuadraticVotingStrategy)


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
        self.staked_tokens = 0
        self.stake_locks = []  # List of (amount, unlock_step)
        if isinstance(voting_strategy, str):
            cls = get_strategy(voting_strategy)
            if cls is None:
                if voting_strategy == "quadratic":
                    cls = QuadraticVotingStrategy
                else:
                    cls = DefaultVotingStrategy
            self.voting_strategy = cls()
        else:
            self.voting_strategy = voting_strategy if voting_strategy else DefaultVotingStrategy()
        self.comments = {}
        self.votes = {}

    def vote_on_proposal(self, proposal):
        self.voting_strategy.vote(self, proposal)

    def leave_comment(self, proposal, sentiment):
        self.comments[proposal] = sentiment
        proposal.add_comment(self, sentiment)

    def stake_tokens(self, amount, token="DAO_TOKEN", lockup_period=0):
        """Stake ``amount`` of ``token`` via the DAO with an optional lockup."""
        self.model.stake_tokens(amount, token, self, lockup_period)

    def unstake_tokens(self, amount, token="DAO_TOKEN"):
        """Attempt to withdraw staked tokens via the DAO."""
        return self.model.unstake_tokens(amount, token, self)

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
        return "no"
