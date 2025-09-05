from data_structures.dao import DAO
from data_structures.project import Project
from agents.validator import Validator
from agents.passive_member import PassiveMember
from data_structures.proposal import Proposal
from data_structures.violation import Violation


def test_pool_events_include_step():
    dao = DAO("TestDAO")
    events = []
    dao.event_bus.subscribe("*", lambda **d: events.append(d))

    step = 7
    # Seed balances
    dao.treasury.deposit("DAO_TOKEN", 10, step=step)
    dao.treasury.deposit("USDC", 10, step=step)

    # Add liquidity should emit liquidity_added with correct step
    dao.treasury.add_liquidity("DAO_TOKEN", "USDC", 5, 5, step=step)
    # Swap should emit token_swap with correct step
    dao.treasury.swap("DAO_TOKEN", "USDC", 1, step=step)
    # Remove liquidity should emit liquidity_removed with correct step
    dao.treasury.remove_liquidity("DAO_TOKEN", "USDC", 0.5, step=step)

    def has_event(name):
        return any(e.get("event") == name and e.get("step") == step for e in events)

    assert has_event("liquidity_added")
    assert has_event("token_swap")
    assert has_event("liquidity_removed")


def test_validator_lag_detection_creates_dispute_and_event():
    dao = DAO("TestDAO")
    events = []
    dao.event_bus.subscribe("*", lambda **d: events.append(d))

    # Create a project with long duration and no work yet
    project = Project(dao, creator=None, title="P1", description="", funding_goal=0, duration=100)
    project.start_time = 0
    dao.current_step = 50  # Halfway through

    v = Validator("val1", dao, tokens=0, reputation=0, location="US")
    # Directly monitor the project; should be behind schedule and raise a dispute
    v.monitor_project(project)

    assert dao.disputes, "Validator should create a dispute when behind schedule"
    assert any(e.get("event") == "project_disputed" for e in events), "Should emit project_disputed event"


def test_votes_and_comments_only_on_open_proposals():
    dao = DAO("TestDAO")
    member = PassiveMember("m1", dao, tokens=100, reputation=10, location="US")
    dao.add_member(member)

    # Create one open and one closed proposal
    open_p = Proposal(dao, member, "Open", "", 10, 5)
    closed_p = Proposal(dao, member, "Closed", "", 10, 5)
    dao.add_proposal(open_p)
    dao.add_proposal(closed_p)
    closed_p.status = "approved"  # no longer open

    # Force current time within open window
    dao.current_step = open_p.creation_time + 1

    # Perform actions
    member.vote_on_random_proposal()
    member.leave_comment_on_random_proposal()

    # Votes/comments should affect only the open proposal
    assert member in open_p.votes
    assert member not in closed_p.votes
    assert any(c.get("member") is member for c in open_p.comments)
    assert not any(c.get("member") is member for c in closed_p.comments)


def test_regulator_violation_event_and_compatibility_list():
    dao = DAO("TestDAO")
    events = []
    dao.event_bus.subscribe("*", lambda **d: events.append(d))

    from agents.regulator import Regulator

    reg = Regulator("reg1", dao, tokens=0, reputation=0, location="US")
    project = Project(dao, creator=None, title="P1", description="", funding_goal=20000, duration=400)

    ok = reg.check_project_compliance(project)
    assert ok is False
    # Expect both a Violation object in the list and the project (compat)
    assert any(isinstance(v, Violation) for v in dao.violations)
    assert project in dao.violations
    assert any(e.get("event") == "violation_created" for e in events)
