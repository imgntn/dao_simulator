from collections import defaultdict


class Project:
    """Simple representation of a project managed by the DAO."""

    def __init__(
        self,
        dao,
        creator,
        title,
        description,
        funding_goal,
        duration=30,
        required_skills=None,
    ):
        self.dao = dao
        self.creator = creator
        self.title = title
        self.description = description
        self.funding_goal = funding_goal
        self.duration = duration
        self.current_funding = 0
        self.required_skills = required_skills or []
        self.work_done = defaultdict(float)
        self.status = "open"
        self.comments = []
        self.start_time = 0
        # Track if funding has been locked in the treasury
        self.funding_locked = False

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})

    def update_work_done(self, member, work_amount):
        self.work_done[member] += work_amount

    def receive_work(self, member, work_amount):
        """Record work contributed by a member."""
        self.update_work_done(member, work_amount)

    def total_work(self) -> float:
        return sum(self.work_done.values())

    def member_share(self, member) -> float:
        total = self.total_work()
        if total == 0:
            return 0.0
        return self.work_done.get(member, 0.0) / total
