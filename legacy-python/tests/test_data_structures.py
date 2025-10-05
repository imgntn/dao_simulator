import unittest
from data_structures import DAO, Proposal, Project, Dispute, Treasury, Violation
from agents.dao_member import DAOMember

class TestDataStructures(unittest.TestCase):
    def setUp(self):
        self.dao = DAO("TestDAO")
        self.member = DAOMember(1, model=None, tokens=100, reputation=10, location="US")
        self.proposal = Proposal(self.dao, self.member, "Title", "Desc", 50, 5)
        self.project = Project(self.dao, self.member, "Project", "Desc", 100, 10)
        self.dispute = Dispute(self.dao, [self.member], "Problem")
        self.treasury = Treasury()
        self.violation = Violation(self.member, self.project, "Breach")

    def test_proposal_fields(self):
        self.assertEqual(self.proposal.title, "Title")

    def test_project_work_update(self):
        self.project.update_work_done(self.member, 5)
        self.assertEqual(self.project.work_done[self.member], 5)

    def test_dispute_resolve(self):
        self.dispute.resolve("Ok")
        self.assertEqual(self.dispute.resolution, "Ok")

    def test_treasury_operations(self):
        self.treasury.deposit("DAO_TOKEN", 100)
        self.assertEqual(self.treasury.get_token_balance("DAO_TOKEN"), 100)
        self.treasury.withdraw("DAO_TOKEN", 40)
        self.assertEqual(self.treasury.get_token_balance("DAO_TOKEN"), 60)

    def test_violation_resolve(self):
        self.violation.resolve()
        self.assertTrue(self.violation.resolved)

if __name__ == "__main__":
    unittest.main()
