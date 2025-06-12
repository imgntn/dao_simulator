import unittest
from utils.event_bus import EventBus
from data_structures import NFTMarketplace
from agents.dao_member import DAOMember
from data_structures.dao import DAO


class TestNFTMarketplace(unittest.TestCase):
    def setUp(self):
        self.bus = EventBus()
        self.dao = DAO("TestDAO")
        self.dao.event_bus = self.bus
        self.market = NFTMarketplace(self.bus)
        self.creator = DAOMember(1, model=self.dao, tokens=100, reputation=10, location="US")
        self.buyer = DAOMember(2, model=self.dao, tokens=50, reputation=5, location="US")

    def test_mint_list_buy(self):
        events = []
        self.bus.subscribe("nft_sold", lambda **d: events.append(d))
        nft = self.market.mint_nft(self.creator, {"name": "Art"}, price=20, listed=False)
        self.market.list_nft(nft.id, 20)
        self.assertTrue(nft.listed)
        ok = self.market.buy_nft(self.buyer, nft.id)
        self.assertTrue(ok)
        self.assertEqual(nft.owner, self.buyer)
        self.assertFalse(nft.listed)
        self.assertEqual(self.creator.tokens, 120)
        self.assertEqual(self.buyer.tokens, 30)
        self.assertTrue(events)


if __name__ == "__main__":
    unittest.main()

