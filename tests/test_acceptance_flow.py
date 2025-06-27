import unittest
import tempfile
import os
from dao_simulation import DAOSimulation


class TestAcceptanceFlow(unittest.TestCase):
    def test_scenario_completion(self):
        data = [
            {"description": "A", "metric": "step", "threshold": 1},
            {"description": "B", "metric": "step", "threshold": 2},
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
        sim.run(2)
        os.remove(path)
        self.assertTrue(all(o["completed"] for o in sim.scenario))


if __name__ == "__main__":
    unittest.main()
