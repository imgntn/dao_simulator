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


if __name__ == "__main__":
    unittest.main()
