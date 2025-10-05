import unittest
from agents import AdaptiveInvestor
from data_structures import DAO, Proposal

class TestAdaptiveInvestor(unittest.TestCase):
    def test_q_learning_updates(self):
        dao = DAO("T")
        inv = AdaptiveInvestor("ai", model=dao, tokens=100, reputation=0, location="US")
        dao.add_member(inv)
        prop = Proposal(dao, inv, "P", "", 10, 1)
        dao.add_proposal(prop)
        inv.invest_in_random_proposal()
        inv.step()  # establish baseline price
        old = inv.q_table.get(getattr(prop, "type", ""), 0)
        dao.treasury.update_token_price("DAO_TOKEN", 1.1)
        inv.step()
        self.assertIn(getattr(prop, "type", ""), inv.q_table)
        self.assertGreaterEqual(inv.q_table[getattr(prop, "type", "")], old)

if __name__ == "__main__":
    unittest.main()
