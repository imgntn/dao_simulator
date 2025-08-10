import unittest
from dao_simulation import DAOSimulation
import settings
from .test_constants import (
    STANDARD_REVENUE,
    XL_AMOUNT,
    TREASURY_INITIAL_FUNDING,
    DEFAULT_TOKEN_EMISSION_RATE,
)

class TestDAOSimulation(unittest.TestCase):
    def setUp(self):
        self.simulation = DAOSimulation()

    def test_step_increments_schedule(self):
        before = self.simulation.schedule.steps
        self.simulation.step()
        after = self.simulation.schedule.steps
        self.assertEqual(after - before, 1)

    def test_dao_initialization(self):
        dao = self.simulation.dao
        agent_keys = [
            "num_developers",
            "num_investors",
            "num_traders",
            "num_delegators",
            "num_proposal_creators",
            "num_validators",
            "num_service_providers",
            "num_arbitrators",
            "num_regulators",
            "num_auditors",
            "num_external_partners",
            "num_passive_members",
        ]
        expected_members = sum(settings.settings[k] for k in agent_keys)
        self.assertEqual(len(dao.members), expected_members)

    def test_liquid_delegators_created(self):
        sim = DAOSimulation(num_liquid_delegators=2, num_delegators=0)
        count = sum(1 for m in sim.dao.members if m.__class__.__name__ == "LiquidDelegator")
        self.assertEqual(count, 2)

    def test_distribute_revenue(self):
        self.simulation.dao.treasury.add_revenue(STANDARD_REVENUE)
        initial_balances = {m.unique_id: m.tokens for m in self.simulation.dao.members}
        for m in self.simulation.dao.members:
            m.stake_tokens(m.tokens, "DAO_TOKEN")
        self.simulation.step()
        total_staked = sum(initial_balances.values())
        for member in self.simulation.dao.members:
            expected = STANDARD_REVENUE * (initial_balances[member.unique_id] / total_staked)
            self.assertAlmostEqual(member.tokens, expected)
            self.assertEqual(member.staked_tokens, initial_balances[member.unique_id])

    def test_execute_token_buyback(self):
        import random
        random.seed(0)
        self.simulation.dao.treasury.deposit("DAO_TOKEN", XL_AMOUNT)
        balance_after_deposit = self.simulation.dao.treasury.get_token_balance("DAO_TOKEN")
        self.simulation.dao.treasury.update_token_price("DAO_TOKEN", 0.9)
        
        self.simulation.step()
        
        # Expected: deposit + emission - buyback
        # Emission happens first, then buyback (10% of total funds)
        balance_after_emission = balance_after_deposit + DEFAULT_TOKEN_EMISSION_RATE
        expected_buyback = balance_after_emission * 0.1
        expected_balance = balance_after_emission - expected_buyback
        actual_balance = self.simulation.dao.treasury.get_token_balance("DAO_TOKEN")
        
        # Allow for small floating point differences
        self.assertAlmostEqual(actual_balance, expected_balance, places=0)

    def test_conduct_regular_meeting(self):
        events = []
        self.simulation.dao.event_bus.subscribe(
            "meeting_result", lambda **d: events.append(d)
        )
        self.simulation.generate_random_topic = lambda: "Topic A"
        for _ in range(30):
            self.simulation.step()
        self.assertEqual(len(events), 1)
        self.assertIn(events[0]["result"], ["yes", "no"])

    def test_csv_export(self):
        import os
        import tempfile

        fd, filename = tempfile.mkstemp(suffix=".csv")
        os.close(fd)
        os.remove(filename)

        sim = DAOSimulation(export_csv=True, csv_filename=filename)
        sim.run(3)

        self.assertTrue(os.path.exists(filename))
        with open(filename) as f:
            header = f.readline().strip().split(",")
        self.assertEqual(
            header,
            [
                "step",
                "num_members",
                "num_proposals",
                "num_projects",
                "avg_tokens",
                "gini_coefficient",
                "reputation_gini",
                "dao_token_price",
            ],
        )

        os.remove(filename)

    def test_parallel_scheduler_single_worker(self):
        sim = DAOSimulation(use_parallel=True, max_workers=1)
        before = sim.schedule.steps
        sim.step()
        after = sim.schedule.steps
        self.assertEqual(after - before, 1)

    def test_async_scheduler(self):
        sim = DAOSimulation(use_async=True)
        before = sim.schedule.steps
        sim.step()
        after = sim.schedule.steps
        self.assertEqual(after - before, 1)

    def test_seed_determinism(self):
        sim1 = DAOSimulation(seed=123)
        sim2 = DAOSimulation(seed=123)
        locs1 = [m.location for m in sim1.dao.members]
        locs2 = [m.location for m in sim2.dao.members]
        self.assertEqual(locs1, locs2)

    def test_market_shock_event(self):
        sim = DAOSimulation(
            num_developers=0,
            num_investors=1,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_auditors=0,
            num_bounty_hunters=0,
            num_external_partners=0,
            num_passive_members=0,
            market_shock_frequency=1,
            comment_probability=0,
        )
        investor = [m for m in sim.dao.members if m.__class__.__name__ == "Investor"][0]
        investor.reputation = 20
        initial_budget = investor.investment_budget
        sim.step()
        self.assertNotEqual(sim.current_shock, 0)
        self.assertNotEqual(investor.investment_budget, initial_budget)

if __name__ == "__main__":
    unittest.main()
