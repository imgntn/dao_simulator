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
        service_budget=100,
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
                self.reputation += 1
                self.mark_active()

    def offer_service(self, proposal):
        """Offer a service to ``proposal`` and record the interaction."""
        service = random.choice(["marketing", "legal", "financial"])
        provided = self.services_provided.setdefault(proposal, [])
        provided.append(service)

        # Simulate value added to the proposal
        if hasattr(proposal, "current_funding"):
            proposal.current_funding += 1
        self.reputation += 1

        if self.model.event_bus:
            self.model.event_bus.publish(
                "service_offered",
                step=self.model.current_step,
                proposal=getattr(proposal, "title", None),
                provider=self.unique_id,
                service=service,
            )

    def provide_service(self, project, service_type, cost):
        self.services_provided[project] = (service_type, cost)

    def to_dict(self):
        data = super().to_dict()
        data["service_budget"] = self.service_budget
        return data
