import random
from agents.dao_member import DAOMember


class ServiceProvider(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        service_budget=1000,  ##TODO: fix magic number
    ):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.service_budget = service_budget
        self.services_provided = dict()

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        self.provide_services()

    def provide_services(self):
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            if self.service_budget > 0:
                self.offer_service(proposal)
                self.service_budget -= 1

    def offer_service(self, proposal):
        # Offer service to the proposal, such as marketing, legal, or financial services.
        # This is a placeholder for the actual implementation of offering services.
        pass

    def provide_service(self, project, service_type, cost):
        self.services_provided[project] = (service_type, cost)
