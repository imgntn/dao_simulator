import unittest
import threading
from utils.event_bus import EventBus


class TestEventBus(unittest.TestCase):
    def test_async_publish(self):
        bus = EventBus(async_mode=True)
        flag = threading.Event()
        result = []

        def handler(event=None, **data):
            result.append(data.get("val"))
            flag.set()

        bus.subscribe("test", handler)
        bus.publish("test", val=42)
        self.assertTrue(flag.wait(0.5))
        self.assertEqual(result, [42])
        bus.close()


if __name__ == "__main__":
    unittest.main()
