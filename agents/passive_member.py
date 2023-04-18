from agents.dao_member import DAOMember


class PassiveMember(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location):
        super().__init__(unique_id, model, tokens, reputation, location)

    def step(self):
        self.vote_on_random_proposal()
