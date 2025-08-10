"""Run a short simulation and trace a single proposal through its lifecycle.

This script creates a small DAOSimulation, injects a FundingProposal with a
very short voting period, subscribes to the DAO event bus to log relevant
events, and steps the simulation while printing the proposal and project
state at each step.
"""
from dao_simulation import DAOSimulation
from data_structures import Project, FundingProposal


def listener(event, **data):
    print(f"EVENT: {event} -> {data}")


def run():
    sim = DAOSimulation(
        seed=42,
        num_developers=0,
        num_investors=2,
        num_delegators=0,
        num_proposal_creators=0,
        num_validators=1,
        num_arbitrators=1,
        num_passive_members=2,
        comment_probability=0.0,
        enable_marketing=False,
    )

    # subscribe to all events to log lifecycle transitions
    if sim.dao.event_bus:
        sim.dao.event_bus.subscribe("*", listener)

    # Build a small project and funding proposal with a short voting period
    # Use an existing member as the creator so visualization/network code
    # (which assumes a creator.unique_id) does not fail.
    creator = sim.dao.members[0] if sim.dao.members else None
    project = Project(sim.dao, creator, "Trace Project", "Test project", funding_goal=100, duration=3)
    proposal = FundingProposal(sim.dao, creator, "Trace Funding Proposal", "Fund trace project", 100, 1, project)

    # Add proposal to DAO
    sim.dao.add_proposal(proposal)

    print("Initial proposal:", proposal.to_dict())
    # Run a few steps to let agents vote/invest and then expire/process the proposal
    for i in range(8):
        print(f"--- Step {i} ---")
        sim.step()
        print("Proposal state:", proposal.to_dict())
        if project in sim.dao.projects:
            print("Project state:", {"title": project.title, "status": project.status, "funding": project.current_funding, "start_time": project.start_time})
        if proposal.status != "open":
            print("Proposal finalized with status:", proposal.status)


if __name__ == "__main__":
    run()
