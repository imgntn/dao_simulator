import unittest
import tempfile
import os

from utils.governance_plugins import load_governance_plugins, get_rule
from dao_simulation import DAOSimulation
from data_structures import Proposal
from agents.dao_member import DAOMember


class TestGovernancePlugins(unittest.TestCase):
    def test_load_custom_rule(self):
        with tempfile.TemporaryDirectory(dir=os.getcwd()) as tmp:
            plugin = os.path.join(tmp, "always.py")
            with open(plugin, "w") as f:
                f.write(
                    "from utils.governance_plugins import GovernanceRule\n"
                    "class Always(GovernanceRule):\n"
                    "    def approve(self, proposal, dao):\n"
                    "        return True\n"
                )
            load_governance_plugins(tmp)
            cls = get_rule("always")
            self.assertIsNotNone(cls)
            self.assertTrue(cls().approve(None, None))

    def test_expire_uses_selected_rule(self):
        with tempfile.TemporaryDirectory(dir=os.getcwd()) as tmp:
            plugin = os.path.join(tmp, "reject.py")
            with open(plugin, "w") as f:
                f.write(
                    "from utils.governance_plugins import GovernanceRule\n"
                    "class Reject(GovernanceRule):\n"
                    "    def approve(self, proposal, dao):\n"
                    "        return False\n"
                )
            load_governance_plugins(tmp)
            sim = DAOSimulation(
                governance_rule="reject",
                num_developers=0,
                num_investors=0,
                num_delegators=0,
                num_proposal_creators=0,
                num_validators=0,
                num_service_providers=0,
                num_arbitrators=0,
                num_regulators=0,
                num_external_partners=0,
                num_passive_members=0,
                comment_probability=0,
            )
            dao = sim.dao
            creator = DAOMember("c", model=dao, tokens=0, reputation=0, location="US")
            dao.add_member(creator)
            proposal = Proposal(dao, creator, "t", "d", 0, 1)
            dao.add_proposal(proposal)
            proposal.add_vote(creator, True)
            sim.schedule.steps = 2
            sim.expire_proposals()
            self.assertEqual(proposal.status, "rejected")


if __name__ == "__main__":
    unittest.main()
