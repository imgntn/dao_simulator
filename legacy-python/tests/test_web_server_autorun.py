import unittest
import httpx
import time
from web_server import WebServer

class TestWebServerAutoRun(unittest.TestCase):
    def test_run_endpoint(self):
        server = WebServer(port=8134)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post('http://localhost:8134/start')
            r = httpx.post('http://localhost:8134/run', json={'steps': 3})
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()['step'], 3)
        finally:
            server.stop()
        # give uvicorn thread time to shut down
        time.sleep(0.6)

if __name__ == '__main__':
    unittest.main()
