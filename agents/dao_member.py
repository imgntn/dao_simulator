from mesa import Agent

class DAOMember(Agent):
    def __init__(self, unique_id, model, tokens, reputation, location):
        super().__init__(unique_id, model)
        self.tokens = tokens
        self.reputation = reputation
        self.location = location

    def step(self):
        pass
