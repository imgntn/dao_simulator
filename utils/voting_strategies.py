from data_structures.proposal import Proposal
import random
from pathlib import Path
from typing import Optional
try:  # pragma: no cover - optional dependency
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except Exception:  # pragma: no cover - fallback when watchdog not installed
    class FileSystemEventHandler:
        pass

    class Observer:
        def schedule(self, *_, **__):
            pass

        def start(self):
            pass

        def stop(self):
            pass

        def join(self, timeout=None):
            pass

from .path_utils import validate_directory

STRATEGY_REGISTRY = {}


def load_strategy_plugins(
    directory: str, *, allowed_dir: Optional[Path] = None
) -> None:
    """Import modules from ``directory`` and register contained strategies.

    Parameters
    ----------
    directory:
        Directory containing strategy plugins.
    allowed_dir:
        If provided, ``directory`` must be inside this path.
    """
    import importlib.util

    dir_path = validate_directory(directory, allowed_base=allowed_dir)

    for path in dir_path.glob("*.py"):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for name, obj in module.__dict__.items():
                if isinstance(obj, type) and hasattr(obj, "vote"):
                    register_strategy(name.lower(), obj)


class _StrategyReloadHandler(FileSystemEventHandler):
    def __init__(self, directory: str, allowed_dir: Optional[Path]) -> None:
        self.directory = directory
        self.allowed_dir = allowed_dir

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".py"):
            load_strategy_plugins(self.directory, allowed_dir=self.allowed_dir)

    on_created = on_modified


def watch_strategy_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> Observer:
    """Watch ``directory`` and reload strategy plugins on change."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)
    handler = _StrategyReloadHandler(directory, allowed_dir)
    observer = Observer()
    observer.schedule(handler, str(dir_path), recursive=False)
    observer.start()
    return observer


def register_strategy(name: str, strategy_cls) -> None:
    """Register ``strategy_cls`` under ``name``.

    If a strategy with the same name already exists it will be updated in
    place so that existing instances pick up the new behaviour.  This is
    useful for hot-reloading during long running simulations.
    """
    existing = STRATEGY_REGISTRY.get(name)
    if existing is not None:
        for attr, val in vars(strategy_cls).items():
            if not attr.startswith("__") or attr == "__doc__":
                setattr(existing, attr, val)
    else:
        STRATEGY_REGISTRY[name] = strategy_cls


def get_strategy(name: str):
    return STRATEGY_REGISTRY.get(name)


def random_vote(proposal: Proposal):
    return random.choice([True, False])


def vote_based_on_budget(proposal: Proposal, budget: float):
    if getattr(proposal, "funding_goal", 0) <= budget:
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

    weight = int(tokens**0.5)
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


class ReputationWeightedStrategy:
    """Weight votes based on ``member.reputation``."""

    def vote(self, member, proposal):
        weight = max(int(member.reputation // 10), 1)
        vote_bool = member.decide_vote(proposal) == "yes"
        member.votes[proposal] = {"vote": vote_bool, "weight": weight}
        proposal.add_vote(member, vote_bool, weight)


register_strategy("reputation_weighted", ReputationWeightedStrategy)
