import random
from agents.dao_member import DAOMember
from data_structures.violation import Violation

class Regulator(DAOMember):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        if random.random() < self.model.regulator_enforce_probability:
            self.enforce()

    def enforce(self):
        # Choose a random violation from the list of violations
        if self.model.violations:
            violation = random.choice(self.model.violations)

            # Enforce the violation
            self.resolve_randomly(violation)

    def resolve_randomly(self, violation):
        decision = random.choice(["punish", "warn", "dismiss"])
        violation.resolution = decision
        self.model.violations.remove(violation)
