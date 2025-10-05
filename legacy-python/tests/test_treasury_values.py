import unittest
from data_structures.treasury import Treasury

class TestTreasuryValues(unittest.TestCase):
    def test_token_value_and_totals(self):
        t = Treasury()
        t.deposit("DAO_TOKEN", 50)
        t.update_token_price("DAO_TOKEN", 2.0)
        self.assertEqual(t.get_token_price("DAO_TOKEN"), 2.0)
        self.assertEqual(t.get_token_value("DAO_TOKEN"), 100)
        self.assertEqual(t.token_balance, 50)
        self.assertEqual(t.reputation_balance, 0)
        self.assertEqual(t.funds, 50)

    def test_revenue_tracking(self):
        t = Treasury()
        t.add_revenue(25)
        self.assertEqual(t.get_revenue_amount(), 25)
        self.assertEqual(t.get_revenue_amount(), 0)

if __name__ == "__main__":
    unittest.main()
