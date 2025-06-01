from .network_graph import plot_network_graph
from .heatmap import plot_heat_map
from .choropleth_map import plot_choropleth_map
import pandas as pd


def generate_report(simulation, csv_file=None):
    """Generate graphs after a simulation run."""
    dao = simulation.dao
    if csv_file:
        df = pd.read_csv(csv_file)
        print(df.describe())
    plot_network_graph(dao)
    plot_heat_map(dao)
    try:
        plot_choropleth_map(dao)
    except Exception as exc:
        print(f"Choropleth plot failed: {exc}")
