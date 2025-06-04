import unittest
import json
import threading
import time
from utils.event_bus import EventBus
from dashboard_server import DashboardServer

class DummyWS:
    def __init__(self):
        self.messages = []
    async def send_text(self, msg):
        self.messages.append(msg)
    async def close(self):
        pass

class TestDashboardServer(unittest.TestCase):
    def test_step_end_contains_gini(self):
        bus = EventBus()
        server = DashboardServer(bus, port=0)
        ws = DummyWS()
        server.connections.append(ws)
        t = threading.Thread(target=server.loop.run_forever, daemon=True)
        t.start()
        bus.publish(
            "step_end",
            step=1,
            num_members=1,
            token_price=1.0,
            recent_proposals=[],
            price_history=[],
            gini_coefficient=0.1,
            gini_history=[0.1],
            top_members=[],
            delegation_centrality={},
            top_influential=[],
        )
        time.sleep(0.1)
        server.loop.call_soon_threadsafe(server.loop.stop)
        t.join()
        self.assertTrue(ws.messages)
        data = json.loads(ws.messages[0])
        self.assertIn("gini_coefficient", data)
        self.assertIn("gini_history", data)
        self.assertIn("top_influential", data)

if __name__ == "__main__":
    unittest.main()
