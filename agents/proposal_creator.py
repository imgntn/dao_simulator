from .dao_member import DAOMember

class ProposalCreator(DAOMember):
    def __init__(self, unique_id, model, tokens, reputation, location, proposal_type):
        super().__init__(unique_id, model, tokens, reputation, location)
        self.proposal_type = proposal_type

    def step(self):
        # ProposalCreator actions during a time step
        self.submit_proposal()

    def submit_proposal(self):
        # Example "funding" implementation
        if self.proposal_type == "funding":
            proposal = {
                'type': 'funding',
                'amount': 1000,
                'description': 'Request for funding a new project.',
                'status': 'open'
            }
            self.model.dao.add_proposal(proposal)
