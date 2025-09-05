import random
from agents.dao_member import DAOMember
from data_structures.violation import Violation


class Regulator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy=None):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.compliance_ensured = []

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        self.ensure_compliance_on_random_project()  # Add this line

    def ensure_compliance_on_random_project(self):  # Add this method
        if self.model.projects:
            project = random.choice(self.model.projects)
            requirement = random.choice(
                ["Environmental impact assessment", "Safety regulations"]
            )
            compliance_issue = {"project": project, "requirement": requirement}
            self.ensure_compliance(compliance_issue)

    def ensure_compliance(self, compliance_issue):
        if self.check_project_compliance(compliance_issue["project"]):
            self.compliance_ensured.append(compliance_issue)

    def check_project_compliance(self, project):
        """Verify that ``project`` meets basic requirements."""
        compliant = project.funding_goal <= 10000 and project.duration <= 365
        if not compliant:
            self.flag_proposal_for_violation(project)
        if self.model.event_bus:
            self.model.event_bus.publish(
                "compliance_checked",
                step=self.model.current_step,
                project=getattr(project, "title", None),
                compliant=compliant,
            )
        return compliant

    def flag_proposal_for_violation(self, proposal):
        # Back-compat: function name mentions proposal but receives a project
        project = proposal
        violator = getattr(project, "creator", None)
        description = (
            f"Project '{getattr(project, 'title', 'unknown')}' failed compliance"
        )
        violation = Violation(violator, project, description)
        self.model.add_violation(violation)
        # Backwards-compatibility for tests expecting the project to appear
        # directly in ``dao.violations``
        if project not in self.model.violations:
            self.model.violations.append(project)
        if self.model.event_bus:
            self.model.event_bus.publish(
                "violation_created",
                step=self.model.current_step,
                project=getattr(project, "title", None),
                violator=getattr(violator, "unique_id", None),
                description=description,
            )

    def to_dict(self):
        return super().to_dict()
