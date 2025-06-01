from data_structures.proposal import Proposal
import random

STRATEGY_REGISTRY = {}


def register_strategy(name: str, strategy_cls) -> None:
    STRATEGY_REGISTRY[name] = strategy_cls


def get_strategy(name: str):
    return STRATEGY_REGISTRY.get(name)


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


def quadratic_vote(proposal: Proposal, tokens: int) -> int:
    """Return the voting weight based on quadratic voting.

    The weight of the vote is the integer square root of the number of tokens
    spent. The caller is responsible for deducting the token cost from the
    member. The returned weight can be used to increase ``votes_for`` or
    ``votes_against`` on the proposal.

    Args:
        proposal (Proposal): The proposal being voted on. (Unused but included
            for consistency with other strategies.)
        tokens (int): Number of tokens the voter is willing to spend.

    Returns:
        int: The voting weight derived from ``tokens``.
    """

    if tokens <= 0:
        return 0

    weight = int(tokens ** 0.5)
    return weight


class ThresholdStrategy:
    """Vote yes if member tokens exceed a threshold."""

    def __init__(self, threshold: int = 100):
        self.threshold = threshold

    def vote(self, member, proposal):
        vote_bool = member.tokens >= self.threshold
        member.votes[proposal] = {"vote": vote_bool, "weight": 1}
        proposal.add_vote(member, vote_bool)


# register default strategy examples
register_strategy("threshold", ThresholdStrategy)
