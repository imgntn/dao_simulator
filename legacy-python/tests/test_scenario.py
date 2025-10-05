import unittest
import tempfile
import os

from dao_simulation import DAOSimulation


class TestScenarioProgress(unittest.TestCase):
    def test_scenario_events(self):
        data = [
            {"description": "Step One", "metric": "step", "threshold": 1},
            {"description": "Step Two", "metric": "step", "threshold": 2},
        ]
        fd, path = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        with open(path, "w") as f:
            import json
            json.dump(data, f)
        sim = DAOSimulation(
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
            scenario_file=path,
            comment_probability=0,
        )
        events = []
        sim.dao.event_bus.subscribe("scenario_progress", lambda **d: events.append(d))
        sim.step()
        self.assertTrue(events)
        self.assertEqual(events[-1]["completed"], ["Step One"])
        sim.step()
        self.assertEqual(events[-1]["completed"], ["Step One", "Step Two"])
        os.remove(path)


if __name__ == "__main__":
    unittest.main()

