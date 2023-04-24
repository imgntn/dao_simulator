class Proposal:
    def __init__(
        self, dao, creator, title, description, funding_goal, duration, project=None
    ):
        self.dao = dao
        self.creator = creator
        self.title = title
        self.description = description
        self.funding_goal = funding_goal
        self.duration = duration
        self.project = project
        self.status = "open"
        self.votes = {"yes": 0, "no": 0}
        self.comments = []
        self.delegated_support = {}

    def add_vote(self, member, vote):
        if member not in self.votes:
            self.votes[vote] += 1

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})

    def receive_delegated_support(self, delegator, token_amount):
        if delegator in self.delegated_support:
            self.delegated_support[delegator] += token_amount
        else:
            self.delegated_support[delegator] = token_amount
