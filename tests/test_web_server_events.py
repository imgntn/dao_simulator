import unittest
import httpx
import time
from web_server import WebServer

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

if __name__ == '__main__':
    unittest.main()
