import unittest
import httpx
import time
import threading
import json
from dao_simulation import DAOSimulation
from utils.event_engine import EventEngine
from web_server import WebServer
from utils.news_feed import NewsFeed


class DummyWS:
    def __init__(self):
        self.messages = []

    async def send_text(self, msg):
        self.messages.append(msg)

    async def close(self):
        pass

class TestWebServerEvents(unittest.TestCase):
    def test_event_endpoints(self):
        server = WebServer(port=8132)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post('http://localhost:8132/start')
            evt = {"step": 0, "type": "create_proposal"}
            r = httpx.post('http://localhost:8132/events', json=evt)
            self.assertEqual(r.status_code, 200)
            r = httpx.get('http://localhost:8132/events')
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertTrue(any(e.get('type') == 'create_proposal' for e in data))
        finally:
            server.stop()

    def test_news_update_broadcast(self):
        server = WebServer(port=0)
        ws = DummyWS()
        server.connections.append(ws)
        t = threading.Thread(target=server.loop.run_forever, daemon=True)
        t.start()
        server.sim = DAOSimulation(enable_player=True)
        server.sim.event_engine = EventEngine(None)
        server.sim.dao.event_bus.subscribe('*', server._on_event)
        server.news_feed = NewsFeed(server.sim.dao.event_bus)
        server.sim.dao.event_bus.publish('proposal_created', step=0)
        server.sim.dao.event_bus.publish('step_end', step=1)
        time.sleep(0.1)
        server.loop.call_soon_threadsafe(server.loop.stop)
        t.join()
        self.assertTrue(ws.messages)
        data = json.loads(ws.messages[-1])
        self.assertEqual(data['event'], 'news_update')

if __name__ == '__main__':
    unittest.main()

