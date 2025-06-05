import unittest
import httpx
import time
from admin_server import AdminServer
from settings import update_settings


class TestAdminServer(unittest.TestCase):
    def test_settings_and_step(self):
        server = AdminServer(port=8125)
        server.start()
        try:
            time.sleep(0.2)
            resp = httpx.get('http://localhost:8125/settings')
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn('num_developers', data)
            resp = httpx.post('http://localhost:8125/settings', json={'num_developers': 1})
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()['num_developers'], 1)
            resp = httpx.post('http://localhost:8125/start')
            self.assertEqual(resp.status_code, 200)
            resp = httpx.post('http://localhost:8125/step')
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()['step'], 1)
        finally:
            server.stop()
            update_settings(num_developers=10)


if __name__ == '__main__':
    unittest.main()
