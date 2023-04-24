import random
from agents.dao_member import DAOMember


class ExternalPartner(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
    ):
        super().__init__(
            unique_id,
            model,
            tokens,
            reputation,
            location,
            voting_strategy,
        )
        self.collaborated_projects = []

    def step(self):
        if random.random() < self.model.external_partner_interact_probability:
            self.interact_with_dao()

    def interact_with_dao(self):
        # Random interaction implementation
        interaction_type = random.choice(
            ["partnership", "collaboration", "integration", "collaborate_on_project"]
        )

        if interaction_type == "partnership":
            self.propose_partnership()
        elif interaction_type == "collaboration":
            self.propose_collaboration()
        elif interaction_type == "integration":
            self.propose_integration()
        elif interaction_type == "collaborate_on_project":
            self.collaborate_on_project()

    def propose_partnership(self):
        print(f"External Partner {self.unique_id} proposes a partnership with the DAO")

    def propose_collaboration(self):
        print(
            f"External Partner {self.unique_id} proposes a collaboration with the DAO"
        )

    def propose_integration(self):
        print(f"External Partner {self.unique_id} proposes an integration with the DAO")

    def collaborate_on_project(self, project):
        work_amount = random.uniform(0, 10)  # Adjust the range as needed
        project.update_work_done(self, work_amount)
        print(
            f"External Partner {self.unique_id} collaborated on project {project.title} and contributed {work_amount:.2f} work units"
        )
        if project not in self.collaborated_projects:
            self.collaborated_projects.append(project)
