import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal

class Validator(DAOMember):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        if random.random() < self.model.validator_validation_probability:
            self.validate()

    def validate(self):
        proposal = self.choose_proposal()
        if proposal is not None:
            self.approve_or_reject_proposal(proposal)

    def choose_proposal(self):
        unvalidated_proposals = [prop for prop in self.model.proposals if not prop.validated]
        if unvalidated_proposals:
            return random.choice(unvalidated_proposals)
        else:
            return None

    def approve_or_reject_proposal(self, proposal):
        # Check if there are enough funds in the treasury to cover the proposal
        if proposal.proposal_type == "funding" and proposal.funding_goal > self.model.dao.treasury.holdings[self.model.dao.treasury.native_token_name]:
            proposal.validated = False
        else:
            proposal.validated = random.random() < self.model.validator_approval_probability
