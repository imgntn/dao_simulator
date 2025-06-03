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

    def test_community_legend(self):
        dao = DAO("X")
        m1 = DAOMember("a", model=dao, tokens=1, reputation=0, location="US")
        m2 = DAOMember("b", model=dao, tokens=1, reputation=0, location="US")
        dao.add_member(m1)
        dao.add_member(m2)
        prop1 = Proposal(dao, m1, "p1", "", 1, 1)
        dao.add_proposal(prop1)
        fig = plot_network_graph(dao, show=False)
        labels = [t.get_text() for t in fig.axes[0].get_legend().get_texts()]
        self.assertTrue(any(l.startswith("Community") for l in labels))

if __name__ == "__main__":
    unittest.main()
