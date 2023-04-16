from .dao_member import DAOMember

class PassiveMember(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, observation_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.observation_strategy = observation_strategy

    def step(self):
        # PassiveMember actions during a time step
        self.observe_dao()

    def observe_dao(self):
        # Example "track_proposals" implementation
        if self.observation_strategy == "track_proposals":
            proposals = self.model.dao.get_proposals()
            self.tracked_proposals = [proposal for proposal in proposals if proposal['status'] == 'open']
