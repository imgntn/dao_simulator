from .dao_member import DAOMember

class Delegator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, delegation_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.delegation_strategy = delegation_strategy

    def step(self):
        # Delegator actions during a time step
        self.delegate()

    def delegate(self):
        # Example "trust_based" implementation
        if self.delegation_strategy == "trust_based":
            candidates = self.model.dao.get_candidates()
            trusted_candidates = [c for c in candidates if c['trust_score'] > 0.8]
            for candidate in trusted_candidates:
                self.tokens -= 1
                candidate['votes'] += 1
