import unittest
from data_structures import DAO, Proposal
from agents import Delegator, LiquidDelegator, DAOMember
from visualizations.network_graph import plot_network_graph

class TestNetworkGraph(unittest.TestCase):
    def test_handles_delegations(self):
        dao = DAO("T")
        rep = DAOMember("r", model=dao, tokens=100, reputation=0, location="US")
        del1 = Delegator("d", model=dao, tokens=100, reputation=0, location="US")
        ldel = LiquidDelegator("l", model=dao, tokens=100, reputation=0, location="US")
        dao.add_member(rep)
        dao.add_member(del1)
        dao.add_member(ldel)
        ldel.delegate_to_member(rep)
        prop = Proposal(dao, rep, "P", "", 10, 1)
        dao.add_proposal(prop)
        del1.delegate_support_to_proposal(prop, 10)
        fig = plot_network_graph(dao, show=False)
        self.assertIsNotNone(fig)

if __name__ == "__main__":
    unittest.main()
