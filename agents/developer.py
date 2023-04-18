import random
from agents.dao_member import DAOMember


class Developer(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, skillset):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.skillset = skillset

    def step(self):
        self.work_on_project()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def work_on_project(self):
        project = self.choose_project_to_work_on()
        if project is not None:
            work_amount = random.uniform(0, self.reputation)
            project.receive_work(self, work_amount)

    def choose_project_to_work_on(self):
        projects = self.model.projects
        if projects:
            project = random.choice(projects)
            return project
        else:
            return None
