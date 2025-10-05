import unittest
import random
from data_structures.treasury import Treasury
from utils.oracles import GeometricBrownianOracle

class TestGeometricBrownianOracle(unittest.TestCase):
    def test_deterministic_with_seed(self):
        random.seed(42)
        t1 = Treasury(oracle=GeometricBrownianOracle(drift=0.1, volatility=0.2))
        t1.update_token_price("DAO_TOKEN", 1.0)
        t1.update_prices()
        price1 = t1.get_token_price("DAO_TOKEN")

        random.seed(42)
        t2 = Treasury(oracle=GeometricBrownianOracle(drift=0.1, volatility=0.2))
        t2.update_token_price("DAO_TOKEN", 1.0)
        t2.update_prices()
        price2 = t2.get_token_price("DAO_TOKEN")

        self.assertEqual(price1, price2)

if __name__ == "__main__":
    unittest.main()
