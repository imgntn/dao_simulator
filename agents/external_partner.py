from .dao_member import DAOMember

class ExternalPartner(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, interaction_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.interaction_strategy = interaction_strategy

    def step(self):
        # ExternalPartner actions during a time step
        self.interact_with_dao()

    def interact_with_dao(self):
        # Example "collaborative" implementation
        if self.interaction_strategy == "collaborative":
            self.model.dao.receive_external_funds(1000)
