import unittest
import os
import tempfile
from dao_simulation import DAOSimulation

class TestSQLiteCollector(unittest.TestCase):
    def test_stats_written(self):
        fd, fname = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        sim = DAOSimulation(
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
            stats_db_filename=fname,
        )
        sim.run(2)
        import sqlite3

        conn = sqlite3.connect(fname)
        rows = conn.execute('SELECT step FROM stats').fetchall()
        conn.close()
        os.remove(fname)
        self.assertEqual(len(rows), 2)

if __name__ == '__main__':
    unittest.main()
