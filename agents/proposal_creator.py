import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal


class ProposalCreator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
        proposal_creation_probability,
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.proposal_creation_probability = proposal_creation_probability

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        if random.random() < self.proposal_creation_probability:
            self.create_proposal()

    def create_proposal(self):
        proposal_types = ["funding", "service", "governance"]
        proposal_type = random.choice(proposal_types)
        funding_goal = random.randint(1, 100) if proposal_type == "funding" else 0
        potential_roi = random.uniform(1.0, 10.0) if proposal_type == "funding" else 0
        proposal = Proposal(self.unique_id, proposal_type, funding_goal, potential_roi)
        self.model.dao.add_proposal(proposal)
