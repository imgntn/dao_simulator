from .dao_member import DAOMember

class Arbitrator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, arbitration_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.arbitration_strategy = arbitration_strategy

    def step(self):
        # Arbitrator actions during a time step
        self.resolve_dispute()

    def resolve_dispute(self):
        # Example "fair_decision" implementation
        if self.arbitration_strategy == "fair_decision":
            disputes = self.model.dao.get_open_disputes()
            for dispute in disputes:
                if dispute['severity'] == "high":
                    dispute['resolution'] = "penalty"
                else:
                    dispute['resolution'] = "warning"
