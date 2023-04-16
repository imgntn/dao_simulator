from .dao_member import DAOMember

class Regulator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, enforcement_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.enforcement_strategy = enforcement_strategy

    def step(self):
        # Regulator actions during a time step
        self.enforce()

    def enforce(self):
        # Example "strict" implementation
        if self.enforcement_strategy == "strict":
            violations = self.model.dao.get_open_violations()
            for violation in violations:
                if violation['severity'] == "high":
                    violation['resolution'] = "heavy_penalty"
                else:
                    violation['resolution'] = "warning"
