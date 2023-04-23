from data_structures.proposal import Proposal
import random


def random_vote(proposal: Proposal):
    return random.choice([True, False])


def vote_based_on_budget(proposal: Proposal, budget: float):
    if proposal.funding_required <= budget:
        return True
    return False


def vote_based_on_duration(proposal: Proposal, max_duration: int):
    if proposal.duration <= max_duration:
        return True
    return False
