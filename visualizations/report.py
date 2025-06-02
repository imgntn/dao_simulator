from .network_graph import plot_network_graph
from .heatmap import plot_heat_map
from .choropleth_map import plot_choropleth_map
from .line_chart import plot_price_history
import pandas as pd
import base64
from io import BytesIO
import matplotlib.pyplot as plt


def _fig_to_base64(fig):
    buf = BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def generate_report(simulation, csv_file=None, html_file=None):
    """Generate graphs after a simulation run."""
    dao = simulation.dao
    stats_html = ""
    price_fig = None
    if csv_file:
        df = pd.read_csv(csv_file)
        stats_html = df.describe().to_html()
        try:
            price_fig = plot_price_history(df["dao_token_price"].tolist(), show=html_file is None)
        except Exception as exc:
            print(f"Price history plot failed: {exc}")
    try:
        fig1 = plot_network_graph(dao, show=html_file is None)
    except Exception as exc:
        print(f"Network graph failed: {exc}")
        fig1 = None
    try:
        fig2 = plot_heat_map(dao, show=html_file is None)
    except Exception as exc:
        print(f"Heat map failed: {exc}")
        fig2 = None
    try:
        fig3 = plot_choropleth_map(dao, show=html_file is None)
    except Exception as exc:
        print(f"Choropleth plot failed: {exc}")
        fig3 = None

    if html_file:
        images = [fig1, fig2, fig3, price_fig]
        html_parts = ["<html><body>"]
        if stats_html:
            html_parts.append(stats_html)
        for fig in images:
            if fig:
                encoded = _fig_to_base64(fig)
                html_parts.append(f'<img src="data:image/png;base64,{encoded}"/>')
        html_parts.append("</body></html>")
        with open(html_file, "w") as f:
            f.write("\n".join(html_parts))
