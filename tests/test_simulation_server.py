import unittest
import httpx
import time
from dao_simulation import DAOSimulation
from simulation_server import SimulationServer

class TestSimulationServer(unittest.TestCase):
    def test_step_endpoint(self):
        sim = DAOSimulation(num_developers=1, num_investors=0, num_delegators=0,
                             num_proposal_creators=0, num_validators=0,
                             num_service_providers=0, num_arbitrators=0,
                             num_regulators=0, num_external_partners=0,
                             num_passive_members=0, num_liquid_delegators=0)
        server = SimulationServer(sim, port=8123)
        server.start()
        try:
            # wait a bit for server start
            time.sleep(0.2)
            resp = httpx.post('http://localhost:8123/step')
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()['step'], 1)
            resp = httpx.get('http://localhost:8123/stats')
            self.assertEqual(resp.status_code, 200)
        finally:
            server.stop()

if __name__ == '__main__':
    unittest.main()
