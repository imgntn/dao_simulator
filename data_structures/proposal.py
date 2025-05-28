class Proposal:
    def __init__(
        self,
        dao,
        creator,
        title,
        description,
        funding_goal,
        duration,
        topic="Default Topic",
        project=None,
    ):
        self.dao = dao
        self.creator = creator
        self.title = title
        self.description = description
        self.funding_goal = funding_goal
        self.duration = duration
        self.project = project
        self.status = "open"
        self.votes = {}
        self.votes_for = 0
        self.votes_against = 0
        self.comments = []
        self.delegated_support = {}
        self.topic = topic
        self.creation_time = 0
        self.voting_period = duration

    def add_vote(self, member, vote):
        if member not in self.votes:
            self.votes[member] = vote
            if vote:
                self.votes_for += 1
            else:
                self.votes_against += 1

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})

    def receive_delegated_support(self, delegator, token_amount):
        if delegator in self.delegated_support:
            self.delegated_support[delegator] += token_amount
        else:
            self.delegated_support[delegator] = token_amount

    def receive_investment(self, investor, amount):
        """Record an investment toward the proposal."""
        self.current_funding = getattr(self, "current_funding", 0) + amount
