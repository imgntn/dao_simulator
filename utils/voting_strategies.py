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


def majority_vote(votes):
    """
    Takes a list of votes and returns the majority vote.

    Args:
        votes (List[str]): A list of votes, where each vote is a string representing a choice.

    Returns:
        str: The majority vote, or None if there is no majority.
    """
    vote_count = {}
    for vote in votes:
        if vote not in vote_count:
            vote_count[vote] = 1
        else:
            vote_count[vote] += 1

    majority_vote = None
    majority_count = 0
    for vote, count in vote_count.items():
        if count > majority_count:
            majority_vote = vote
            majority_count = count

    if majority_count > len(votes) / 2:
        return majority_vote
    else:
        return None
