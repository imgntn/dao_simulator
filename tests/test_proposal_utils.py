import unittest
from data_structures import DAO
from agents import ProposalCreator
from utils.proposal_utils import create_random_proposal, submit_random_proposal

class TestProposalUtils(unittest.TestCase):
    def test_create_random_proposal(self):
        dao = DAO("TestDAO")
        creator = ProposalCreator("creator", model=dao, tokens=10, reputation=1, location="US")
        proposal = create_random_proposal(dao, creator, title_prefix="T", topic="Topic X")
        self.assertEqual(proposal.dao, dao)
        self.assertEqual(proposal.creator, creator)
        self.assertTrue(proposal.title.startswith("T"))
        self.assertEqual(proposal.topic, "Topic X")
        self.assertGreater(proposal.funding_goal, 0)
        self.assertGreater(proposal.duration, 0)

    def test_submit_random_proposal(self):
        dao = DAO("TestDAO")
        creator = ProposalCreator("creator", model=dao, tokens=10, reputation=1, location="US")
        dao.add_member(creator)
        proposal = submit_random_proposal(dao, creator)
        self.assertIn(proposal, creator.submitted_proposals)
        self.assertNotIn(proposal, dao.proposals)

if __name__ == "__main__":
    unittest.main()
