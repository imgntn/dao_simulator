from collections import defaultdict


class Project:
    def __init__(self, dao, creator, title, description, funding_goal, duration):
        self.dao = dao
        self.creator = creator
        self.title = title
        self.description = description
        self.funding_goal = funding_goal
        self.duration = duration
        self.current_funding = 0
        self.work_done = defaultdict(float)
        self.status = "open"
        self.comments = []

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})

    def update_work_done(self, member, work_amount):
        self.work_done[member] += work_amount
