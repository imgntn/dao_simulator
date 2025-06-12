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

    def test_unsubscribe_and_once(self):
        bus = EventBus()
        calls = []

        def cb(event=None, **d):
            calls.append("cb")

        bus.subscribe("e", cb)
        bus.unsubscribe("e", cb)
        bus.publish("e")
        self.assertEqual(calls, [])

        bus.subscribe_once("e", cb)
        bus.publish("e")
        bus.publish("e")
        self.assertEqual(calls, ["cb"])

    def test_wildcard_subscription(self):
        bus = EventBus()
        seen = []

        def cb(event=None, **d):
            seen.append(event)

        bus.subscribe("*", cb)
        bus.publish("a")
        bus.publish("b")
        self.assertEqual(seen, ["a", "b"])


if __name__ == "__main__":
    unittest.main()
