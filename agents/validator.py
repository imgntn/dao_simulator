from .dao_member import DAOMember

class Validator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, validation_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.validation_strategy = validation_strategy

    def step(self):
        # Validator actions during a time step
        self.validate()

    def validate(self):
        # Example "strict" implementation
        if self.validation_strategy == "strict":
            proposals = self.model.dao.get_open_proposals()
            for proposal in proposals:
                if proposal['risk_level'] == "high":
                    proposal['status'] = "rejected"
                else:
                    proposal['status'] = "approved"
