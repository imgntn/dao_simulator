import unittest
from dao_simulation import DAOSimulation
import settings

class TestDAOSimulation(unittest.TestCase):
    def setUp(self):
        self.simulation = DAOSimulation()

    def test_dao_initialization(self):
        dao = self.simulation.dao
        agent_keys = [
            "num_developers",
            "num_investors",
            "num_delegators",
            "num_proposal_creators",
            "num_validators",
            "num_service_providers",
            "num_arbitrators",
            "num_regulators",
            "num_external_partners",
            "num_passive_members",
        ]
        expected_members = sum(settings.settings[k] for k in agent_keys)
        self.assertEqual(len(dao.members), expected_members)

    def test_distribute_revenue(self):
        self.simulation.dao.treasury.add_revenue(1000)
        initial_balances = {m.unique_id: m.tokens for m in self.simulation.dao.members}
        self.simulation.step()
        total_staked = sum(initial_balances.values())
        for member in self.simulation.dao.members:
            expected = initial_balances[member.unique_id] + 1000 * (initial_balances[member.unique_id] / total_staked)
            self.assertAlmostEqual(member.tokens, expected)

    def test_execute_token_buyback(self):
        self.simulation.dao.treasury.deposit("DAO_TOKEN", 6000)
        self.simulation.step()
        self.assertEqual(self.simulation.dao.treasury.get_token_balance("DAO_TOKEN"), 5400)

    def test_conduct_regular_meeting(self):
        self.simulation.generate_random_topic = lambda: "Topic A"
        for _ in range(30):
            self.simulation.step()
        # if no exception occurs, meeting ran successfully

if __name__ == "__main__":
    unittest.main()
