import unittest
import httpx
import time
from web_server import WebServer


class TestPlayerAgent(unittest.TestCase):
    def test_player_actions(self):
        server = WebServer(port=8130)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post('http://localhost:8130/start')
            self.assertIsNotNone(server.sim)
            httpx.post('http://localhost:8130/player/create')
            httpx.post('http://localhost:8130/step')
            self.assertEqual(len(server.sim.dao.proposals), 1)
            httpx.post('http://localhost:8130/player/vote', json={'id': 0, 'vote': True})
            httpx.post('http://localhost:8130/step')
            prop = server.sim.dao.proposals[0]
            self.assertEqual(prop.votes_for, 1)
            httpx.post('http://localhost:8130/player/comment', json={'id': 0, 'sentiment': 'positive'})
            httpx.post('http://localhost:8130/step')
            comments_by_player = [c for c in prop.comments if c['member'] == server.sim.player]
            self.assertTrue(comments_by_player)
            httpx.post('http://localhost:8130/player/delegate', json={'id': 0, 'amount': 5})
            httpx.post('http://localhost:8130/step')
            self.assertEqual(prop.delegated_support.get(server.sim.player, 0), 5)
        finally:
            server.stop()


if __name__ == '__main__':
    unittest.main()
