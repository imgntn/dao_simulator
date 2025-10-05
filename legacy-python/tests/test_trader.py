import unittest
from agents import Trader
from data_structures import DAO


class TestTrader(unittest.TestCase):
    def test_trader_swaps_tokens(self):
        dao = DAO("D")
        dao.treasury.deposit("DAO_TOKEN", 100)
        dao.treasury.deposit("USDC", 100)
        dao.treasury.create_pool("DAO_TOKEN", "USDC")
        dao.treasury.add_liquidity("DAO_TOKEN", "USDC", 50, 50)

        trader = Trader("T", model=dao, tokens=10, reputation=0, location="US")
        dao.add_member(trader)

        pool = dao.treasury.pools[("DAO_TOKEN", "USDC")]
        before_a = pool.reserve_a
        before_b = pool.reserve_b

        trader.step()

        after_a = pool.reserve_a
        after_b = pool.reserve_b

        self.assertTrue(before_a != after_a or before_b != after_b)
        self.assertNotEqual(trader.tokens, 10)


if __name__ == "__main__":
    unittest.main()
