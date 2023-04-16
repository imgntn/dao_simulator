class Proposal:
    def __init__(self, proposal_id, proposer, title, description, proposal_type, amount=None, voting_start=None, voting_end=None):
        self.proposal_id = proposal_id
        self.proposer = proposer
        self.title = title
        self.description = description
        self.proposal_type = proposal_type
        self.amount = amount
        self.voting_start = voting_start
        self.voting_end = voting_end
        self.votes_for = 0
        self.votes_against = 0
