from .dao_member import DAOMember

class Investor(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, investment_strategy):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.investment_strategy = investment_strategy

    def step(self):
        # Investor actions during a time step
        self.invest()

    def invest(self):
        # Example implementation based on investment strategy
        projects = self.model.dao.get_open_projects()
        for project in projects:
            if self.investment_strategy == "high_risk":
                if project['risk_level'] == "high":
                    investment_amount = self.tokens * 0.1
                    self.tokens -= investment_amount
                    project['funding'] += investment_amount
            elif self.investment_strategy
