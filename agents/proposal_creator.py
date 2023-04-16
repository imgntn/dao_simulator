import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal

class ProposalCreator(DAOMember):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        if random.random() < self.model.proposal_creation_probability:
            self.submit_proposal()

    def submit_proposal(self):
        proposal_type = random.choice(self.model.proposal_types)
        if proposal_type == "funding":
            proposal = self.create_funding_proposal()
        elif proposal_type == "governance_improvement":
            proposal = self.create_governance_proposal()
        elif proposal_type == "tokenomics_change":
            proposal = self.create_tokenomics_proposal()
        else:
            proposal = None

        if proposal:
            self.model.dao.add_proposal(proposal)

    def create_funding_proposal(self):
        funding_goal = random.uniform(self.model.min_funding_goal, self.model.max_funding_goal)
        proposal = Proposal("funding", {"funding_goal": funding_goal})
        return proposal

    def create_governance_proposal(self):
        # Implementation for creating a governance improvement proposal
        pass

    def create_tokenomics_proposal
