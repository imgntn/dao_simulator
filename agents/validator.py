import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal


class Validator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
        monitoring_budget,
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.monitoring_budget = monitoring_budget

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        self.validate_and_monitor()

    def validate_and_monitor(self):
        # Implementation of validating proposals and monitoring projects
        for proposal in self.model.dao.proposals:
            if proposal.status == "submitted":
                self.validate_proposal(proposal)
            elif proposal.status == "approved" and proposal.proposal_type == "project":
                project = proposal.related_project
                if not project.monitored:
                    self.monitor_project(project)

    def validate_proposal(self, proposal):
        # Implementation of proposal validation
        if self.monitoring_budget > 0:
            proposal.status = "validated"
            self.monitoring_budget -= 1

    def monitor_project(self, project):
        # Implementation of project monitoring
        if self.monitoring_budget > 0:
            project.monitored = True
            self.monitoring_budget -= 1

    def vote_on_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            self.vote_on_proposal(proposal)

    def leave_comment_on_random_proposal(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            sentiment = random.choice(["positive", "negative", "neutral"])
            self.leave_comment(proposal, sentiment)
