import random
from agents.dao_member import DAOMember


class Developer(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy=None,
        skillset=["Generic Code"],
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
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
            self.reputation += work_amount / 10

    def choose_project_to_work_on(self):
        projects = [p for p in self.model.projects if p.status == "open"]
        if not projects:
            return None

        # Score projects by skill match. Highest score wins.
        def score(project):
            if not project.required_skills:
                return 0
            overlap = set(self.skillset).intersection(project.required_skills)
            return len(overlap) / len(project.required_skills)

        best_score = -1
        best_projects = []
        for p in projects:
            s = score(p)
            if s > best_score:
                best_score = s
                best_projects = [p]
            elif s == best_score:
                best_projects.append(p)

        return random.choice(best_projects)

    def to_dict(self):
        data = super().to_dict()
        data["skillset"] = self.skillset
        return data
