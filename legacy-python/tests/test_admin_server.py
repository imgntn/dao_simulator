import unittest
import httpx
import time
from admin_server import AdminServer
from settings import update_settings
from .test_constants import get_test_port


class TestAdminServer(unittest.TestCase):
    def test_settings_and_step(self):
        port = get_test_port(0)  # Use base test port
        server = AdminServer(port=port)
        server.start()
        try:
            time.sleep(0.2)
            resp = httpx.get(f'http://localhost:{port}/settings')
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn('num_developers', data)
            resp = httpx.post(f'http://localhost:{port}/settings', json={'num_developers': 1})
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()['num_developers'], 1)
            resp = httpx.post(f'http://localhost:{port}/start')
            self.assertEqual(resp.status_code, 200)
            resp = httpx.post(f'http://localhost:{port}/step')
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()['step'], 1)
        finally:
            server.stop()
            update_settings(num_developers=10)


if __name__ == '__main__':
    unittest.main()
