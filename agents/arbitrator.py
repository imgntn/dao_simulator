import random
from agents.dao_member import DAOMember
from data_structures.dispute import Dispute

class Arbitrator(DAOMember):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        if random.random() < self.model.arbitrator_resolve_probability:
            self.resolve_dispute()

    def resolve_dispute(self):
        # Choose a random dispute from the list of disputes
        if self.model.disputes:
            dispute = random.choice(self.model.disputes)

            # Resolve the dispute
            self.resolve_randomly(dispute)

    def resolve_randomly(self, dispute):
        decision = random.choice(["party_a", "party_b"])
        dispute.resolution = decision
        self.model.disputes.remove(dispute)
