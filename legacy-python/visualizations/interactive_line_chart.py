try:
    import plotly.graph_objects as go
except Exception:  # pragma: no cover - plotly optional
    go = None


def interactive_price_history(prices):
    """Return a Plotly figure for DAO token price history."""
    if go is None:
        raise RuntimeError("plotly not installed")
    fig = go.Figure(data=[go.Scatter(y=prices, mode="lines+markers")])
    fig.update_layout(
        title="DAO Token Price History",
        xaxis_title="Step",
        yaxis_title="DAO Token Price",
    )
    return fig
