import os
import tempfile
import unittest
from dao_simulation import DAOSimulation

class TestPersistence(unittest.TestCase):
    def test_save_and_load(self):
        sim = DAOSimulation()
        sim.run(2)
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        sim.save_state(fname)

        loaded = DAOSimulation.load_state(fname)
        os.remove(fname)
        self.assertEqual(sim.schedule.steps, loaded.schedule.steps)
        self.assertEqual(len(sim.dao.members), len(loaded.dao.members))
        self.assertEqual(len(sim.dao.proposals), len(loaded.dao.proposals))

if __name__ == "__main__":
    unittest.main()
