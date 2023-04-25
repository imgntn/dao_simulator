import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal


class ProposalCreator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.submitted_proposals = []  # Add this line to store submitted proposals

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        self.create_proposal()

    def create_proposal(self):
        proposal_id = len(self.model.proposals)
        proposal_type = random.choice(["project", "funding", "governance"])
        description = f"Proposal {proposal_id}: {proposal_type}"
        amount = random.randint(1, 100)
        duration = random.randint(1, 50)
        topic = "Topic A"  # You can replace this with a random or predefined topic

        proposal = Proposal(
            proposal_id,
            self,
            proposal_type,
            description,
            amount,
            duration,
            topic,  # Add this line
        )
        self.model.proposals.append(proposal)

    def submit_proposal(self, proposal):  # Add this method to submit a proposal
        self.submitted_proposals.append(proposal)
