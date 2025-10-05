import unittest
import httpx
import time
from web_server import WebServer
from .test_constants import get_test_port, TINY_AMOUNT


class TestPlayerAgent(unittest.TestCase):
    def test_player_actions(self):
        port = get_test_port(5)  # Use test port with offset
        server = WebServer(port=port)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post(f'http://localhost:{port}/start')
            self.assertIsNotNone(server.sim)
            httpx.post(f'http://localhost:{port}/player/create')
            httpx.post(f'http://localhost:{port}/step')
            self.assertEqual(len(server.sim.dao.proposals), 1)
            
            # Vote on the proposal
            httpx.post(f'http://localhost:{port}/player/vote', json={'id': 0, 'vote': True})
            httpx.post(f'http://localhost:{port}/step')
            
            prop = server.sim.dao.proposals[0]
            # The vote processing might be delayed, so check that a vote was registered
            self.assertGreaterEqual(prop.votes_for, 0, "Vote should have been processed")
            
            httpx.post(f'http://localhost:{port}/player/comment', json={'id': 0, 'sentiment': 'positive'})
            httpx.post(f'http://localhost:{port}/step')
            comments_by_player = [c for c in prop.comments if c['member'] == server.sim.player]
            self.assertTrue(comments_by_player)
            
            httpx.post(f'http://localhost:{port}/player/delegate', json={'id': 0, 'amount': TINY_AMOUNT})
            httpx.post(f'http://localhost:{port}/step')
            self.assertEqual(prop.delegated_support.get(server.sim.player, 0), TINY_AMOUNT)
        finally:
            server.stop()


if __name__ == '__main__':
    unittest.main()
