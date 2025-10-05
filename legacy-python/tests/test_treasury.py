import unittest
from data_structures.treasury import Treasury


class TestTreasury(unittest.TestCase):
    def setUp(self):
        self.treasury = Treasury()
        self.treasury.deposit("USDC", 1000)
        self.treasury.deposit("ETH", 100)

    def test_deposit(self):
        self.assertEqual(self.treasury.tokens["USDC"], 1000)
        self.assertEqual(self.treasury.tokens["ETH"], 100)
        self.treasury.deposit("USDC", 500)
        self.assertEqual(self.treasury.tokens["USDC"], 1500)
        self.treasury.deposit("ETH", 50)
        self.assertEqual(self.treasury.tokens["ETH"], 150)

    def test_withdraw(self):
        self.assertEqual(self.treasury.tokens["USDC"], 1000)
        self.assertEqual(self.treasury.tokens["ETH"], 100)
        self.treasury.withdraw("USDC", 200)
        self.assertEqual(self.treasury.tokens["USDC"], 800)
        self.treasury.withdraw("ETH", 30)
        self.assertEqual(self.treasury.tokens["ETH"], 70)

    def test_balance(self):
        balance_usdc = self.treasury.get_token_balance("USDC")
        balance_eth = self.treasury.get_token_balance("ETH")
        self.assertEqual(balance_usdc, 1000)
        self.assertEqual(balance_eth, 100)

    def test_update_prices(self):
        import random

        random.seed(0)
        self.treasury.update_token_price("DAO_TOKEN", 1.0)
        old_price = self.treasury.get_token_price("DAO_TOKEN")
        self.treasury.update_prices(volatility=0.1)
        new_price = self.treasury.get_token_price("DAO_TOKEN")
        self.assertTrue(0.9 <= new_price <= 1.1)
        self.assertNotEqual(old_price, new_price)

    def test_lock_and_withdraw_locked(self):
        self.treasury.deposit("DAO_TOKEN", 50)
        locked = self.treasury.lock_tokens("DAO_TOKEN", 30)
        self.assertEqual(locked, 30)
        self.assertEqual(self.treasury.get_locked_balance("DAO_TOKEN"), 30)
        withdrawn = self.treasury.withdraw_locked("DAO_TOKEN", 20)
        self.assertEqual(withdrawn, 20)
        self.assertEqual(self.treasury.get_locked_balance("DAO_TOKEN"), 10)


if __name__ == "__main__":
    unittest.main()
