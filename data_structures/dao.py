from collections import defaultdict
from data_structures.treasury import Treasury


class DAO:
    def __init__(
        self,
        name,
        violation_probability=0.1,
        reputation_penalty=5,
        comment_probability=0.5,
        external_partner_interact_probability=0.0,
    ):
        self.name = name
        self.proposals = []
        self.projects = []
        self.disputes = []
        self.violations = []
        self.members = []
        self.treasury = Treasury()
        self.comment_probability = comment_probability
        self.external_partner_interact_probability = (
            external_partner_interact_probability
        )
        self.violation_probability = violation_probability
        self.reputation_penalty = reputation_penalty
        self.current_step = 0

    def add_proposal(self, proposal):
        proposal.creation_time = self.current_step
        self.proposals.append(proposal)

    def add_project(self, project):
        self.projects.append(project)

    def add_dispute(self, dispute):
        self.disputes.append(dispute)

    def add_violation(self, violation):
        self.violations.append(violation)

    def add_member(self, member):
        self.members.append(member)

    def remove_proposal(self, proposal):
        self.proposals.remove(proposal)

    def remove_project(self, project):
        self.projects.remove(project)

    def remove_dispute(self, dispute):
        self.disputes.remove(dispute)

    def remove_violation(self, violation):
        self.violations.remove(violation)

    def remove_member(self, member):
        self.members.remove(member)

    def distribute_revenue(self, amount, token):
        # Placeholder for revenue distribution logic
        pass

    def buyback_tokens(self, amount, token="DAO_TOKEN"):
        self.treasury.withdraw(token, amount)

    def stake_tokens(self, amount, token, member):
        # Placeholder for token staking logic
        pass

