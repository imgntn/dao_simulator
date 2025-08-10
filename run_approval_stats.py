"""Run multiple short simulations and report how many proposals are approved.

This script runs several independent simulations with a modest population of
agents (including some ProposalCreators and Investors) and reports, per
simulation, the total proposals created and how many reached status
"approved". It prints aggregated statistics across runs.
"""
from dao_simulation import DAOSimulation
from utils.voting_strategies import get_strategy
import statistics


def run_once(seed: int, steps: int = 50, voting_strategy_name: str | None = None):
    sim = DAOSimulation(
        seed=seed,
        num_developers=0,
        num_investors=8,
        num_proposal_creators=5,
        num_validators=1,
        num_arbitrators=1,
        num_passive_members=5,
        comment_probability=0.0,
        enable_marketing=False,
    )

    # disable dynamic new-member creation to keep runs stable for stats
    sim.add_new_agents = lambda: None

    # apply voting strategy to all members if requested
    if voting_strategy_name:
        cls = get_strategy(voting_strategy_name)
        if cls is None:
            # fallback: try to accept the class name used in DAOMember
            # (e.g., "quadratic") by id; otherwise ignore
            pass
        else:
            for m in sim.dao.members:
                try:
                    m.voting_strategy = cls()
                except Exception:
                    # ignore members that cannot accept the strategy
                    continue

    for _ in range(steps):
        sim.step()

    proposals = sim.dao.proposals
    approved = [p for p in proposals if p.status == "approved"]
    return len(proposals), len(approved)


def main():
    runs = 10
    steps = 60
    results = []
    strategies = [None, "reputation_weighted", "quadratic"]
    for strat in strategies:
        print(f"\n=== Strategy: {str(strat)} ===")
        results = []
        for i in range(runs):
            total, approved = run_once(seed=1000 + i, steps=steps, voting_strategy_name=strat)
            results.append((total, approved))
            print(f"Run {i}: total proposals={total}, approved={approved}")

        totals = [t for t, a in results]
        approveds = [a for t, a in results]
        print()
        print(f"Across {runs} runs (each {steps} steps):")
        print(f"  avg proposals: {statistics.mean(totals):.2f} (min {min(totals)}, max {max(totals)})")
        print(f"  avg approved:  {statistics.mean(approveds):.2f} (min {min(approveds)}, max {max(approveds)})")
        if sum(totals) > 0:
            print(f"  overall approval rate: {sum(approveds)/sum(totals):.2%}")

    totals = [t for t, a in results]
    approveds = [a for t, a in results]
    print()
    print(f"Across {runs} runs (each {steps} steps):")
    print(f"  avg proposals: {statistics.mean(totals):.2f} (min {min(totals)}, max {max(totals)})")
    print(f"  avg approved:  {statistics.mean(approveds):.2f} (min {min(approveds)}, max {max(approveds)})")
    if sum(totals) > 0:
        print(f"  overall approval rate: {sum(approveds)/sum(totals):.2%}")


if __name__ == "__main__":
    main()
