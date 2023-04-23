import unittest
from data_structures import (
    DAO,
    Proposal,
    Project,
    Dispute,
    Treasury,
    Violation,
)


class TestDataStructures(unittest.TestCase):
    def setUp(self):
        self.dao = DAO()
        self.proposal = Proposal(
            1, "Proposal 1", "A proposal for a new project", 100, 5, "developer"
        )
        self.project = Project(1, "Project 1", "A project description", 500, 10)
        self.dispute = Dispute(
            1, "Dispute 1", "A dispute description", "developer", "arbitrator"
        )
        self.treasury = Treasury()
        self.treasury.deposit("USDC", 1000)
        self.treasury.deposit("ETH", 100)
        self.violation = Violation(
            1, "Violation 1", "A violation description", "developer", "regulator"
        )

    def test_dao_creation(self):
        self.assertEqual(len(self.dao.members), 0)
        self.assertEqual(len(self.dao.proposals), 0)
        self.assertEqual(len(self.dao.projects), 0)

    def test_proposal_creation(self):
        self.assertEqual(self.proposal.id, 1)
        self.assertEqual(self.proposal.title, "Proposal 1")
        self.assertEqual(self.proposal.description, "A proposal for a new project")
        self.assertEqual(self.proposal.budget, 100)
        self.assertEqual(self.proposal.duration, 5)

    def test_project_creation(self):
        self.assertEqual(self.project.id, 1)
        self.assertEqual(self.project.title, "Project 1")
        self.assertEqual(self.project.description, "A project description")
        self.assertEqual(self.project.budget, 500)
        self.assertEqual(self.project.duration, 10)

    def test_dispute_creation(self):
        self.assertEqual(self.dispute.id, 1)
        self.assertEqual(self.dispute.title, "Dispute 1")
        self.assertEqual(self.dispute.description, "A dispute description")
        self.assertEqual(self.dispute.reporting_party, "developer")
        self.assertEqual(self.dispute.resolving_party, "arbitrator")

    def test_treasury_creation(self):
        self.assertEqual(self.treasury.tokens["USDC"], 1000)
        self.assertEqual(self.treasury.tokens["ETH"], 100)

    def test_violation_creation(self):
        self.assertEqual(self.violation.id, 1)
        self.assertEqual(self.violation.title, "Violation 1")
        self.assertEqual(self.violation.description, "A violation description")
        self.assertEqual(self.violation.reporting_party, "developer")
        self.assertEqual(self.violation.resolving_party, "regulator")


if __name__ == "__main__":
    unittest.main()
