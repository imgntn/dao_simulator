import unittest
import time
import httpx
from utils import EventBus
from utils.news_feed import NewsFeed
from web_server import WebServer


class TestNewsFeed(unittest.TestCase):
    def test_news_feed_summary(self):
        bus = EventBus()
        feed = NewsFeed(bus)
        captured = []
        bus.subscribe("news_update", lambda event=None, summary=None, **d: captured.append(summary))
        bus.publish("proposal_created", step=0)
        bus.publish("nft_minted", step=0)
        bus.publish("step_end", step=1)
        self.assertTrue(feed.summaries)
        self.assertEqual(captured[0], feed.summaries[0])

    def test_trending_counts(self):
        bus = EventBus()
        feed = NewsFeed(bus)
        bus.publish("proposal_created", step=0)
        bus.publish("nft_minted", step=0)
        bus.publish("step_end", step=1)
        bus.publish("proposal_created", step=1)
        bus.publish("step_end", step=2)
        trending = feed.get_trending(2)
        self.assertEqual(trending[0][0], "proposal")
        self.assertEqual(trending[0][1], 2)
        self.assertEqual(trending[1][0], "created")

    def test_news_endpoint(self):
        server = WebServer(port=8136)
        server.start()
        try:
            time.sleep(0.2)
            httpx.post("http://localhost:8136/start")
            httpx.post("http://localhost:8136/step")
            r = httpx.get("http://localhost:8136/news")
            self.assertEqual(r.status_code, 200)
            data = r.json()
            self.assertIsInstance(data, list)
            self.assertTrue(data)
            r = httpx.get("http://localhost:8136/trending")
            self.assertEqual(r.status_code, 200)
            tdata = r.json()
            self.assertIsInstance(tdata, list)
        finally:
            server.stop()
            time.sleep(0.6)


if __name__ == "__main__":
    unittest.main()

