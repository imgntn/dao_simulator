import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal


class Validator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy):
        super().__init__(unique_id, model, tokens, reputation, location, voting_strategy)

    def step(self):
        # Validators should review and validate proposals.
        proposal_to_validate = self.choose_proposal_to_validate()
        if proposal_to_validate is not None:
            self.validate_proposal(proposal_to_validate)

    def choose_proposal_to_validate(self):
        # Choose a proposal that has not yet been validated.
        not_validated_proposals = [
            prop for prop in self.model.proposals if not prop.validated]
        if not_validated_proposals:
            return random.choice(not_validated_proposals)
        else:
            return None

    def validate_proposal(self, proposal):
        # Check if the proposal meets certain requirements, e.g., enough collateral, realistic goals, etc.
        # For simplicity, we'll assume the validator approves the proposal with a certain probability.
        if random.random() < self.model.validator_approval_probability:
            proposal.validated = True

        # Vote on the proposal
        self.vote_on_proposal(proposal)

        # Leave a comment on the proposal
        sentiment = 'positive' if proposal.validated else 'negative'
        self.add_comment(proposal, sentiment)
