import unittest
import random
from data_structures import DAO, Proposal
from agents import Delegator, Arbitrator, DAOMember
from data_structures.dispute import Dispute

class TestNewFeatures(unittest.TestCase):
    def test_delegator_step_delegates(self):
        random.seed(0)
        dao = DAO("Test", violation_probability=0.0, reputation_penalty=0)
        creator = DAOMember("c", model=dao, tokens=100, reputation=10, location="US")
        proposal = Proposal(dao, creator, "Title", "Desc", 50, 5)
        dao.add_proposal(proposal)
        delegator = Delegator("d", model=dao, tokens=100, reputation=10, location="US")
        dao.add_member(delegator)

        initial_budget = delegator.delegation_budget
        delegator.step()
        self.assertLess(delegator.delegation_budget, initial_budget)
        self.assertTrue(delegator.delegations)

    def test_arbitrator_arbitrate_uses_settings(self):
        random.seed(0)
        dao = DAO("Test", violation_probability=1.0, reputation_penalty=3)
        member = DAOMember("m", model=dao, tokens=100, reputation=10, location="US")
        dispute = Dispute(
            dao,
            [member],
            "Test dispute",
            importance=1,
            project=None,
            member=member,
        )
        dao.add_dispute(dispute)
        arbitrator = Arbitrator("a", model=dao, tokens=100, reputation=10, location="US")
        dao.add_member(arbitrator)

        arbitrator.arbitrate(dispute)
        self.assertTrue(dispute.resolved)
        self.assertEqual(member.reputation, 7)

if __name__ == "__main__":
    unittest.main()
