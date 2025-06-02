import unittest
import tempfile
import os
from data_structures.treasury import Treasury
from utils.oracles import load_oracle_plugins, get_oracle


class FixedOracle:
    def update_prices(self, treasury, *_, **__):
        treasury.update_token_price("DAO_TOKEN", 2.0)


class TestOraclePlugins(unittest.TestCase):
    def test_custom_oracle_used(self):
        t = Treasury(oracle=FixedOracle())
        t.update_token_price("DAO_TOKEN", 1.0)
        t.update_prices()
        self.assertEqual(t.get_token_price("DAO_TOKEN"), 2.0)

    def test_load_plugins_registers_oracle(self):
        with tempfile.TemporaryDirectory() as tmp:
            plugin = os.path.join(tmp, "fixed.py")
            with open(plugin, "w") as f:
                f.write("class Fixed:\n    def update_prices(self, treasury,*a,**k):\n        treasury.update_token_price('DAO_TOKEN', 3.0)\n")
            load_oracle_plugins(tmp)
            cls = get_oracle("fixed")
            self.assertIsNotNone(cls)
            t = Treasury(oracle=cls())
            t.update_token_price("DAO_TOKEN", 1.0)
            t.update_prices()
            self.assertEqual(t.get_token_price("DAO_TOKEN"), 3.0)


if __name__ == "__main__":
    unittest.main()
