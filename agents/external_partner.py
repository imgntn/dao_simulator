import random
from agents.dao_member import DAOMember

class ExternalPartner(DAOMember):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        if random.random() < self.model.external_partner_interact_probability:
            self.interact_with_dao()

    def interact_with_dao(self):
        # Random interaction implementation
        interaction_type = random.choice(["partnership", "collaboration", "integration"])

        if interaction_type == "partnership":
            self.propose_partnership()
        elif interaction_type == "collaboration":
            self.propose_collaboration()
        elif interaction_type == "integration":
            self.propose_integration()

    def propose_partnership(self):
        print(f"External Partner {self.unique_id} proposes a partnership with the DAO")

    def propose_collaboration(self):
        print(f"External Partner {self.unique_id} proposes a collaboration with the DAO")

    def propose_integration(self):
        print(f"External Partner {self.unique_id} proposes an integration with the DAO")
