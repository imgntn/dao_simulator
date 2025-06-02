import unittest
from data_structures import DAO, Proposal
from agents import DAOMember, LiquidDelegator


class TestLiquidDelegator(unittest.TestCase):
    def test_delegate_votes_follow_representative(self):
        dao = DAO("D")
        rep = DAOMember("r", model=dao, tokens=100, reputation=10, location="US")
        delegator = LiquidDelegator("d", model=dao, tokens=100, reputation=0, location="US")
        dao.add_member(rep)
        dao.add_member(delegator)
        proposal = Proposal(dao, rep, "t", "d", 10, 5)
        dao.add_proposal(proposal)

        delegator.delegate_to_member(rep)
        rep.vote_on_proposal(proposal)

        self.assertIn(delegator, proposal.votes)
        self.assertEqual(proposal.votes[delegator]["vote"], proposal.votes[rep]["vote"])


if __name__ == "__main__":
    unittest.main()
