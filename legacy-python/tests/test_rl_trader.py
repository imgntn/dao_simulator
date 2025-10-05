import unittest
from agents import RLTrader
from data_structures import DAO


class TestRLTrader(unittest.TestCase):
    def test_q_learning_updates(self):
        dao = DAO("D")
        dao.treasury.deposit("DAO_TOKEN", 100)
        dao.treasury.deposit("USDC", 100)
        dao.treasury.create_pool("DAO_TOKEN", "USDC")
        dao.treasury.add_liquidity("DAO_TOKEN", "USDC", 10, 10)
        trader = RLTrader("rlt", model=dao, tokens=10, reputation=0, location="US")
        dao.add_member(trader)
        trader.step()
        prev_q = dict(trader.q)
        dao.treasury.update_token_price("DAO_TOKEN", 1.1)
        trader.step()
        self.assertTrue(any(v != 0 for v in trader.q.values()))
        self.assertNotEqual(prev_q, trader.q)


if __name__ == "__main__":
    unittest.main()
