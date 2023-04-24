import random
from agents.dao_member import DAOMember
from data_structures.dispute import Dispute
from data_structures.violation import Violation


class Arbitrator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
        arbitration_capacity=1000,  ##TODO: fix magic number
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.arbitration_capacity = arbitration_capacity

    def step(self):
        if self.model.disputes:
            self.handle_dispute()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def handle_dispute(self):
        dispute = self.choose_dispute()
        if dispute is not None:
            self.arbitrate(dispute)

    def choose_dispute(self):
        pending_disputes = [d for d in self.model.disputes if not d.resolved]
        if pending_disputes:
            dispute = max(pending_disputes, key=lambda d: d.importance)
            return dispute
        else:
            return None

    def arbitrate(self, dispute):
        if self.arbitration_capacity > 0:
            dispute.resolved = True
            self.arbitration_capacity -= 1

            if random.random() < self.model.violation_probability:
                violation = Violation(
                    dispute.project, dispute.member, dispute.description
                )
                self.model.dao.add_violation(violation)
                dispute.member.reputation -= self.model.reputation_penalty
