import unittest
from data_structures.treasury import Treasury


class TestTreasuryPricePressure(unittest.TestCase):
    def test_price_rises_on_withdrawal(self):
        t = Treasury()
        t.tokens["DAO_TOKEN"] = 1000
        t.update_token_price("DAO_TOKEN", 1.0)
        t.withdraw("DAO_TOKEN", 100)
        import random

        random.seed(0)
        t.update_prices(volatility=0.0)
        self.assertGreater(t.get_token_price("DAO_TOKEN"), 1.0)

    def test_price_drops_on_deposit(self):
        t = Treasury()
        t.tokens["DAO_TOKEN"] = 1000
        t.update_token_price("DAO_TOKEN", 1.0)
        t.deposit("DAO_TOKEN", 100)
        import random

        random.seed(0)
        t.update_prices(volatility=0.0)
        self.assertLess(t.get_token_price("DAO_TOKEN"), 1.0)


if __name__ == "__main__":
    unittest.main()
