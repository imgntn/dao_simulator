import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal


class ProposalCreator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, voting_strategy=None):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.submitted_proposals = []  # Add this line to store submitted proposals
        self.last_proposal_step = -10  # Track when last proposal was created
        self.proposal_cooldown = 10  # Minimum steps between proposals

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        # Only create proposals with reasonable frequency
        if self.model.current_step - self.last_proposal_step >= self.proposal_cooldown:
            if random.random() < 0.3:  # 30% chance to create proposal when cooldown is over
                self.create_proposal()

    def create_proposal(self):
        proposal_id = len(self.model.proposals)
        proposal_type = random.choice([
            "project",
            "funding",
            "governance",
            "quadratic_funding",
        ])
        title = f"Proposal {proposal_id}"
        description = f"{proposal_type} proposal {proposal_id}"
        # More realistic funding amounts and durations
        if proposal_type in ["funding", "quadratic_funding"]:
            amount = random.randint(500, 5000)  # Reasonable project funding amounts
        else:
            amount = random.randint(1, 100)
        duration = random.randint(10, 100)  # Longer, more realistic project durations
        topic = "Topic A"  # You can replace this with a random or predefined topic

        if proposal_type == "quadratic_funding":
            from data_structures import Project, QuadraticFundingProposal

            project = Project(self.model, self, title, description, amount, duration)
            proposal = QuadraticFundingProposal(
                self.model,
                self,
                title,
                description,
                amount,
                duration,
                project,
            )
        else:
            proposal = Proposal(
                self.model,
                self,
                title,
                description,
                amount,
                duration,
                topic,
            )
        self.model.add_proposal(proposal)
        self.last_proposal_step = self.model.current_step  # Record when proposal was created
        self.mark_active()

    def submit_proposal(self, proposal):  # Add this method to submit a proposal
        self.submitted_proposals.append(proposal)

    def to_dict(self):
        return super().to_dict()
