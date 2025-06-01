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

        def score(project):
            # Skill alignment ratio
            if project.required_skills:
                overlap = set(self.skillset).intersection(project.required_skills)
                skill_score = len(overlap) / len(project.required_skills)
            else:
                skill_score = 0

            # Funding progress encourages well-funded projects
            if project.funding_goal:
                funding_score = project.current_funding / project.funding_goal
            else:
                funding_score = 0

            total_work = sum(project.work_done.values())
            progress = total_work / project.duration if project.duration else 0

            return skill_score * 0.6 + funding_score * 0.3 + (1 - progress) * 0.1

        scored = {p: score(p) for p in projects}
        best_score = max(scored.values())
        best_projects = [p for p, s in scored.items() if s == best_score]
        return random.choice(best_projects)

    def to_dict(self):
        data = super().to_dict()
        data["skillset"] = self.skillset
        return data
