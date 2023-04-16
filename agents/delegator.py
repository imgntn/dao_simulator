import random
from agents.dao_member import DAOMember
from data_structures.proposal import Proposal

class Delegator(DAOMember):
    def __init__(self, unique_id, model, trust_threshold, expertise_threshold):
        super().__init__(unique_id, model)
        self.trust_threshold = trust_threshold
        self.expertise_threshold = expertise_threshold

    def step(self):
        if random.random() < self.model.delegator_delegate_probability:
            self.delegate()

    def delegate(self):
        candidates = self.find_candidates()
        if candidates:
            self.assign_delegates(candidates)

    def find_candidates(self):
        # Trust-based implementation
        trusted_candidates = [member for member in self.model.dao_members if member.trust_score >= self.trust_threshold]
        return trusted_candidates

    def assign_delegates(self, candidates):
        # Expertise-based implementation
        proposal = self.choose_proposal()
        if proposal is not None:
            experts = [member for member in candidates if set(member.skills).intersection(set(proposal.required_skills))]
            if experts:
                selected_delegate = random.choice(experts)
                self.delegate_to(selected_delegate, proposal)

    def choose_proposal(self):
        # Choose a random proposal from the list of proposals
        if self.model.proposals:
            proposal = random.choice(self.model.proposals)
            return proposal
        else:
            return None

    def delegate_to(self, delegate, proposal):
        # Assign the selected delegate to the proposal
        delegate.add_delegation(proposal)
