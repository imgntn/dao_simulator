import random
from agents.dao_member import DAOMember
from data_structures import Dispute


class Validator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy=None,
        monitoring_budget=100,
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.monitoring_budget = monitoring_budget
        self.monitored_projects = set()

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
                self.mark_active()

    def monitor_project(self, project):
        """Monitor ``project`` and raise a dispute if progress lags."""
        self.monitored_projects.add(project)
        total = project.total_work()
        dur = max(getattr(project, "duration", 0), 1)
        elapsed = max(self.model.current_step - getattr(project, "start_time", 0), 0)
        progress_ratio = total / dur
        elapsed_ratio = min(elapsed / dur, 1.0)
        epsilon = 0.05
        behind = progress_ratio + epsilon < elapsed_ratio
        if behind:
            dispute = Dispute(
                self.model,
                [project.creator],
                "Project behind schedule",
                project=project,
            )
            self.model.add_dispute(dispute)
            if self.model.event_bus:
                self.model.event_bus.publish(
                    "project_disputed",
                    step=self.model.current_step,
                    project=getattr(project, "title", None),
                    validator=self.unique_id,
                )
        if self.model.event_bus:
            self.model.event_bus.publish(
                "project_monitored",
                step=self.model.current_step,
                project=getattr(project, "title", None),
                progress=total,
                behind=behind,
            )

    def to_dict(self):
        data = super().to_dict()
        data["monitoring_budget"] = self.monitoring_budget
        return data
