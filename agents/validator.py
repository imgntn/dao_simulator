import random
from agents.dao_member import DAOMember


class Validator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
        monitoring_budget=1000,  ##TODO: fix this magic number
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.monitoring_budget = monitoring_budget

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        self.monitor_projects()

    def monitor_projects(self):
        if self.model.projects:
            project = random.choice(self.model.projects)
            if self.monitoring_budget > 0:
                self.monitor_project(project)
                self.monitoring_budget -= 1

    def monitor_project(self, project):
        # Monitor the project and report any issues or concerns.
        # This is a placeholder for the actual implementation of project monitoring.
        pass
