import unittest
import httpx
import time
from web_server import WebServer

class TestWebServerDEX(unittest.TestCase):
    def test_dex_endpoints(self):
        server = WebServer(port=8136)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post('http://localhost:8136/start')
            r = httpx.post('http://localhost:8136/player/add_liquidity', json={
                'token_a': 'DAO_TOKEN', 'token_b': 'USDC', 'amount_a': 5, 'amount_b': 5
            })
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()['queued'], 'add_liquidity')
            httpx.post('http://localhost:8136/step')
            pool = server.sim.dao.treasury.pools.get(('DAO_TOKEN', 'USDC'))
            self.assertIsNotNone(pool)
            self.assertAlmostEqual(pool.reserve_a, 5)
            r = httpx.post('http://localhost:8136/player/swap', json={
                'token_in': 'DAO_TOKEN', 'token_out': 'USDC', 'amount': 1
            })
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()['queued'], 'swap')
            before = pool.reserve_a
            httpx.post('http://localhost:8136/step')
            self.assertGreater(pool.reserve_a, before)
            r = httpx.post('http://localhost:8136/player/remove_liquidity', json={
                'token_a': 'DAO_TOKEN', 'token_b': 'USDC', 'share': 0.5
            })
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()['queued'], 'remove_liquidity')
            httpx.post('http://localhost:8136/step')
            self.assertLess(pool.reserve_a, before)
        finally:
            server.stop()

if __name__ == '__main__':
    unittest.main()
