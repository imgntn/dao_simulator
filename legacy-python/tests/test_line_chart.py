import unittest
from visualizations.line_chart import plot_price_history


class TestLineChart(unittest.TestCase):
    def test_plot_returns_figure(self):
        fig = plot_price_history([1, 2, 3], show=False)
        self.assertIsNotNone(fig)


if __name__ == "__main__":
    unittest.main()
