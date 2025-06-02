import random
from agents.dao_member import DAOMember
from data_structures.dispute import Dispute


class Auditor(DAOMember):
    """Agent that flags suspicious proposals."""

    def step(self):
        self.review_proposals()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

    def review_proposals(self):
        for proposal in list(self.model.proposals):
            if proposal.status != "open":
                continue
            if proposal.funding_goal > 1000 or "suspicious" in proposal.description.lower():
                dispute = Dispute(
                    self.model,
                    [proposal.creator],
                    f"Audit flag for {proposal.title}",
                    importance=1,
                    project=proposal.project,
                    member=proposal.creator,
                )
                self.model.add_dispute(dispute)

