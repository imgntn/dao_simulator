import unittest
from utils.voting_strategies import register_strategy
from agents import DAOMember
from data_structures import DAO, Proposal


class AlwaysYes:
    def vote(self, member, proposal):
        member.votes[proposal] = {"vote": True, "weight": 1}
        proposal.add_vote(member, True)


class TestStrategyRegistry(unittest.TestCase):
    def test_custom_strategy_registration(self):
        register_strategy("always_yes", AlwaysYes)
        dao = DAO("D")
        member = DAOMember("m", model=dao, tokens=0, reputation=0, location="US", voting_strategy="always_yes")
        proposal = Proposal(dao, member, "t", "d", 10, 5)
        dao.add_proposal(proposal)
        member.vote_on_proposal(proposal)
        self.assertEqual(proposal.votes_for, 1)


if __name__ == "__main__":
    unittest.main()
