import os
import tempfile
import unittest

from dao_simulation import DAOSimulation


class TestMarketplaceIntegration(unittest.TestCase):
    def test_marketplace_exposed_on_dao(self):
        sim = DAOSimulation(num_artists=1, num_collectors=1)
        # DAO object should reference the same marketplace
        self.assertIs(sim.dao.marketplace, sim.marketplace)
        sim.step()
        self.assertGreater(len(sim.marketplace.nfts), 0)

    def test_marketplace_after_load(self):
        sim = DAOSimulation(num_artists=1, num_collectors=0)
        sim.step()
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        sim.save_state(fname)
        loaded = DAOSimulation.load_state(fname)
        os.remove(fname)
        # Newly loaded simulation must also expose marketplace on DAO
        self.assertIs(loaded.dao.marketplace, loaded.marketplace)
        # Ensure stepping works without attribute errors
        loaded.step()
        self.assertIsNotNone(loaded.marketplace)


if __name__ == "__main__":
    unittest.main()
