import random
from utils.voting_strategies import quadratic_vote, register_strategy, get_strategy

try:
    from mesa import Agent
except ImportError:
    # Fallback for testing environments without Mesa
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
        # Mesa Agent expects (unique_id, model) but may have different signature
        # Try Mesa's signature first, fallback to simple init
        try:
            super().__init__(unique_id, model)
        except TypeError:
            # Fallback for custom Agent class or different Mesa versions
            self.unique_id = unique_id
            self.model = model
        self.tokens = tokens
        self.reputation = reputation
        self.location = location
        self.staked_tokens = 0
        self.stake_locks = []  # List of (amount, unlock_step)
        self.staking_rate = getattr(model, "staking_interest_rate", 0.0)
        self.compound_stake = False
        self.guild = None
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
        self.delegates = []
        self._active = False
        # Add pos attribute for Mesa visualization compatibility
        self.pos = None

    def mark_active(self):
        self._active = True

    def vote_on_proposal(self, proposal):
        self.voting_strategy.vote(self, proposal)
        self.mark_active()
        for delegate in getattr(self, "delegates", []):
            delegate.receive_representative_vote(
                proposal,
                self.votes[proposal]["vote"],
                self.votes[proposal]["weight"],
            )

    def leave_comment(self, proposal, sentiment):
        self.comments[proposal] = sentiment
        proposal.add_comment(self, sentiment)
        self.mark_active()

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

    # Guild interactions
    def join_guild(self, guild):
        if self.guild is guild:
            return
        if self.guild:
            self.guild.remove_member(self)
        guild.add_member(self)

    def leave_guild(self):
        if self.guild:
            self.guild.remove_member(self)

    def create_guild(self, name):
        guild = self.model.create_guild(name, creator=self)
        self.join_guild(guild)
        return guild

    def decide_vote(self, topic):
        if topic == "Topic A":
            return "yes" if self.reputation > 50 else "no"
        elif topic == "Topic B":
            return "yes" if self.tokens > 200 else "no"
        elif topic == "Topic C":
            return "yes" if self.location == "USA" else "no"
        return "no"

    def to_dict(self):
        return {
            "class": type(self).__name__,
            "unique_id": self.unique_id,
            "tokens": self.tokens,
            "reputation": self.reputation,
            "location": self.location,
            "staking_rate": self.staking_rate,
            "compound_stake": self.compound_stake,
            "staked_tokens": self.staked_tokens,
            "guild": self.guild.name if self.guild else None,
        }

    @classmethod
    def from_dict(cls, data, model):
        cls_map = {c.__name__: c for c in cls.__subclasses__()}
        cls_map[cls.__name__] = cls
        agent_cls = cls_map.get(data["class"], cls)
        member = agent_cls(
            data["unique_id"],
            model,
            data.get("tokens", 0),
            data.get("reputation", 0),
            data.get("location", "US"),
        )
        member.staking_rate = data.get("staking_rate", getattr(model, "staking_interest_rate", 0.0))
        member.compound_stake = data.get("compound_stake", False)
        member.staked_tokens = data.get("staked_tokens", 0)
        return member
