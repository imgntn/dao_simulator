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

    def add_vote(self, member, vote):
        if member not in self.votes:
            self.votes[vote] += 1

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})
