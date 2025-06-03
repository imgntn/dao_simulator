import networkx as nx
try:
    import plotly.graph_objects as go
except Exception:  # pragma: no cover - plotly optional
    go = None


def interactive_network(dao):
    """Return a Plotly figure visualising DAO members and proposals."""
    if go is None:
        raise RuntimeError("plotly not installed")
    G = nx.DiGraph()
    for member in dao.members:
        G.add_node(member.unique_id)
    for proposal in dao.proposals:
        pid = proposal.title
        G.add_node(pid)
        if hasattr(proposal, "creator"):
            G.add_edge(proposal.creator.unique_id, pid)
    pos = nx.spring_layout(G)
    edge_x, edge_y = [], []
    for u, v in G.edges():
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        edge_x += [x0, x1, None]
        edge_y += [y0, y1, None]
    node_x = [pos[n][0] for n in G.nodes()]
    node_y = [pos[n][1] for n in G.nodes()]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=edge_x, y=edge_y, mode="lines", line=dict(color="gray"), hoverinfo="none"))
    fig.add_trace(go.Scatter(x=node_x, y=node_y, text=list(G.nodes()), mode="markers+text"))
    fig.update_layout(showlegend=False)
    return fig
