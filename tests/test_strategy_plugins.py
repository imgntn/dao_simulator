import unittest
import tempfile
import os
from utils.voting_strategies import load_strategy_plugins, get_strategy
from data_structures import DAO, Proposal
from agents import DAOMember

class TestStrategyPlugins(unittest.TestCase):
    def test_load_plugins_registers_strategy(self):
        with tempfile.TemporaryDirectory() as tmp:
            plugin = os.path.join(tmp, "always_yes.py")
            with open(plugin, "w") as f:
                f.write("class AlwaysYes:\n    def vote(self, member, proposal):\n        member.votes[proposal]={'vote':True,'weight':1};proposal.add_vote(member, True)\n")
            load_strategy_plugins(tmp)
            self.assertIsNotNone(get_strategy("alwaysyes"))
            dao = DAO("D")
            member = DAOMember("m", model=dao, tokens=0, reputation=0, location="US", voting_strategy="alwaysyes")
            proposal = Proposal(dao, member, "t", "d", 10, 5)
            dao.add_proposal(proposal)
            member.vote_on_proposal(proposal)
            self.assertEqual(proposal.votes_for, 1)

if __name__ == "__main__":
    unittest.main()
