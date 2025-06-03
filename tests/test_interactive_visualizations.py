import unittest
try:
    import plotly  # type: ignore
except Exception:  # pragma: no cover - plotly not installed
    plotly = None
from data_structures import DAO, Proposal
from agents import DAOMember
from visualizations.interactive_line_chart import interactive_price_history
from visualizations.interactive_network import interactive_network


@unittest.skipIf(plotly is None, "plotly not installed")
class TestInteractiveVisualizations(unittest.TestCase):
    def test_price_chart_returns_plotly_figure(self):
        fig = interactive_price_history([1, 2, 3])
        self.assertTrue(hasattr(fig, "to_html"))

    def test_network_returns_plotly_figure(self):
        dao = DAO("D")
        member = DAOMember("m", model=dao, tokens=0, reputation=0, location="US")
        dao.add_member(member)
        proposal = Proposal(dao, member, "t", "d", 1, 1)
        dao.add_proposal(proposal)
        fig = interactive_network(dao)
        self.assertTrue(hasattr(fig, "to_html"))


if __name__ == "__main__":
    unittest.main()
