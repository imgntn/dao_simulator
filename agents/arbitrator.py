import random
from agents.dao_member import DAOMember
from data_structures.dispute import Dispute


class Arbitrator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy, dispute_resolution_budget):
        super().__init__(unique_id, model, tokens, reputation, location, voting_strategy)
        self.dispute_resolution_budget = dispute_resolution_budget

    def step(self):
        if random.random() < self.model.arbitrator_dispute_resolution_probability:
            self.resolve_dispute()

    def resolve_dispute(self):
        dispute = self.choose_dispute_to_resolve()
        if dispute is not None:
            self.work_on_dispute_resolution(dispute)

    def choose_dispute_to_resolve(self):
        # Choose an unresolved dispute.
        unresolved_disputes = [
            dispute for dispute in self.model.disputes if not dispute.resolved]
        if unresolved_disputes:
            return random.choice(unresolved_disputes)
        else:
            return None

    def work_on_dispute_resolution(self, dispute):
        # Arbitrator resolves the dispute, contributing a portion of their budget.
        resolution_contribution = min(
            self.dispute_resolution_budget, dispute.remaining_resolution_budget)
        dispute.remaining_resolution_budget -= resolution_contribution
        self.dispute_resolution_budget -= resolution_contribution

        # If the dispute resolution budget is depleted, the dispute is marked as resolved.
        if dispute.remaining_resolution_budget <= 0:
            dispute.resolved = True

        # Arbitrator votes on the proposal related to the dispute
        self.vote_on_proposal(dispute.proposal)

        # Arbitrator leaves a comment on the proposal
        sentiment = 'positive' if dispute.resolved else 'neutral'
        self.add_comment(dispute.proposal, sentiment)
