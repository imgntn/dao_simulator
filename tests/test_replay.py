import unittest
import os
import tempfile
from dao_simulation import DAOSimulation
import replay


class TestReplay(unittest.TestCase):
    def test_replay_counts(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        sim = DAOSimulation(
            event_logging=True,
            event_log_filename=fname,
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
        sim.dao.treasury.deposit("DAO_TOKEN", 10)
        sim.run(2)
        data = replay.replay_log(fname)
        self.assertEqual(data["proposals"], len(sim.dao.proposals))
        self.assertAlmostEqual(data["treasury"].get("DAO_TOKEN", 0), sim.dao.treasury.get_token_balance("DAO_TOKEN"))
        os.remove(fname)


if __name__ == "__main__":
    unittest.main()

