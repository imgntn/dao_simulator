import unittest
import os
import tempfile
from dao_simulation import DAOSimulation

class TestCheckpoints(unittest.TestCase):
    def test_checkpoint_resume(self):
        with tempfile.TemporaryDirectory() as tmp:
            sim = DAOSimulation(
                checkpoint_interval=1,
                checkpoint_path=tmp,
                num_developers=1,
                num_investors=0,
                num_delegators=0,
                num_proposal_creators=0,
                num_validators=0,
                num_service_providers=0,
                num_arbitrators=0,
                num_regulators=0,
                num_external_partners=0,
                num_passive_members=0,
            )
            sim.run(1)
            cp = os.path.join(tmp, 'checkpoint_1.json')
            self.assertTrue(os.path.exists(cp))

            resumed = DAOSimulation.load_state(cp)
            resumed.run(1)
            self.assertEqual(resumed.schedule.steps, 2)

if __name__ == '__main__':
    unittest.main()
