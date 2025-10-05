import unittest
import httpx
import time
from web_server import WebServer

class TestLeaderboardEndpoint(unittest.TestCase):
    def test_leaderboard_endpoint(self):
        server = WebServer(port=8127)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post('http://localhost:8127/start')
            httpx.post('http://localhost:8127/step')
            resp = httpx.get('http://localhost:8127/leaderboard')
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn('token', data)
            self.assertIn('influence', data)
        finally:
            server.stop()

if __name__ == '__main__':
    unittest.main()
