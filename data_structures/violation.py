class Violation:
    def __init__(self, violation_id, violator, description, penalty=None):
        self.violation_id = violation_id
        self.violator = violator
        self.description = description
        self.penalty = penalty
