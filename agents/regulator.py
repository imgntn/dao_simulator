import random
from agents.dao_member import DAOMember


class Regulator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy):
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
        # Perform some checks to determine if the project is compliant
        # with external regulations and requirements. This is a placeholder
        # for actual compliance checks.
        return random.choice([True, False])

    def flag_proposal_for_violation(self, proposal):
        self.model.violations.append(proposal)
