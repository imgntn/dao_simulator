import random
from agents.dao_member import DAOMember
from data_structures.project import Project


class Developer(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy, development_budget):
        super().__init__(unique_id, model, tokens, reputation, location, voting_strategy)
        self.development_budget = development_budget

    def work_on_project(self, project):
        if self.development_budget > 0 and project.status == "in_progress":
            work_done = min(self.development_budget, project.remaining_work)
            self.development_budget -= work_done
            project.remaining_work -= work_done
            if project.remaining_work == 0:
                project.status = "completed"

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        for project in self.model.dao.projects:
            if project.developer_id == self.unique_id:
                self.work_on_project(project)
                break

    def vote_on_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            self.vote_on_proposal(proposal)

    def leave_comment_on_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            sentiment = random.choice(["positive", "negative", "neutral"])
            self.leave_comment(proposal, sentiment)
