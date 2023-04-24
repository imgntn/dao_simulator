import unittest
from data_structures import (
    DAO,
    Proposal,
    Project,
    Dispute,
    Treasury,
    Violation,
)

from agents import DAOMember


class TestDataStructures(unittest.TestCase):
    def setUp(self):
        dao = DAO("Sample DAO")
        self.dao = dao
        self.dao_member = DAOMember(
            1,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        dao_instance = self.dao  # Replace with your DAO instance
        creator_instance = self.dao_member  # Replace with a DAOMember instance

        self.dao = DAO("TestDAO")
        self.proposal = Proposal(
            dao=dao_instance,
            creator=creator_instance,
            title="Proposal 1",
            description="A proposal for a new project",
            funding_goal=100,
            duration=5,
        )
        self.project = Project(
            dao=dao_instance,
            creator=creator_instance,
            title="Project 1",
            description="A project description",
            funding_goal=500,
            duration=10,
        )
        self.dispute = Dispute(
            dao=dao_instance,
            creator=creator_instance,
            title="Dispute 1",
            description="A dispute description",
            reporting_party=creator_instance,
            resolving_party=your_arbitrator_instance,  # Replace with an instance of a resolving party (DAOMember or other class)
        )
        self.treasury = Treasury()
        self.treasury.deposit("USDC", 1000)
        self.treasury.deposit("ETH", 100)
        self.violation = Violation(
            dao=dao_instance,
            creator=creator_instance,
            title="Violation 1",
            description="A violation description",
            reporting_party=creator_instance,
            resolving_party=your_regulator_instance,  # Replace with an instance of a resolving party (DAOMember or other class)
        )

    # Keep the existing test methods without changes
    # ...


if __name__ == "__main__":
    unittest.main()
