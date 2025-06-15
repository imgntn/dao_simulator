import unittest
import tempfile
import json
from dao_simulation import DAOSimulation
from utils.event_engine import EventEngine


class TestEventEngine(unittest.TestCase):
    def test_events_trigger_actions(self):
        events = [
            {"step": 0, "type": "market_shock", "severity": 0.5},
            {"step": 0, "type": "create_proposal", "title": "Event"},
        ]
        fd, path = tempfile.mkstemp(suffix=".json")
        with open(path, "w") as f:
            json.dump(events, f)
        sim = DAOSimulation(
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=1,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_external_partners=0,
            num_passive_members=0,
            events_file=path,
            comment_probability=0,
        )
        price_before = sim.dao.treasury.get_token_price("DAO_TOKEN")
        sim.step()
        price_after = sim.dao.treasury.get_token_price("DAO_TOKEN")
        self.assertNotEqual(price_after, price_before)
        self.assertTrue(sim.dao.proposals)

    def test_add_event_runtime(self):
        sim = DAOSimulation(
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=1,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_external_partners=0,
            num_passive_members=0,
            comment_probability=0,
        )
        sim.event_engine = EventEngine(None)
        sim.event_engine.add_event({"step": 1, "type": "create_proposal", "title": "Runtime"})
        sim.step()
        self.assertEqual(len(sim.dao.proposals), 1)
        sim.step()
        self.assertEqual(len(sim.dao.proposals), 2)


if __name__ == "__main__":
    unittest.main()
