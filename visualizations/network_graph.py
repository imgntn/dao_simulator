import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from networkx.algorithms.community import greedy_modularity_communities


def plot_network_graph(dao, show=True):
    G = nx.DiGraph()

    # Adding member and proposal nodes to the graph
    for member in dao.members:
        G.add_node(member.unique_id, node_type=type(member).__name__)

    for proposal in dao.proposals:
        prop_id = proposal.title
        G.add_node(prop_id, node_type="Proposal")
        if hasattr(proposal, "creator"):
            G.add_edge(proposal.creator.unique_id, prop_id)

    # Delegation links
    delegation_edges = []
    for member in dao.members:
        if hasattr(member, "delegations"):
            for prop, amount in member.delegations.items():
                delegation_edges.append((member.unique_id, prop.title, {"weight": amount, "style": "dashed", "color": "blue"}))
        rep = getattr(member, "representative", None)
        if rep is not None:
            delegation_edges.append((member.unique_id, rep.unique_id, {"style": "dashed", "color": "purple"}))
    for u, v, d in delegation_edges:
        G.add_edge(u, v, **d)

    pos = nx.spring_layout(G)

    communities = []
    try:
        communities = list(greedy_modularity_communities(G))
    except Exception:
        communities = []
    community_map = {}
    for idx, comm in enumerate(communities):
        for n in comm:
            community_map[n] = idx

    palette = plt.cm.get_cmap("tab10")
    node_colors = []
    for node in G.nodes(data=True):
        node_type = node[1]["node_type"]
        if node[0] in community_map:
            color = palette(community_map[node[0]] % 10)
        elif node_type == "Proposal":
            color = "lightgreen"
        else:
            color = "skyblue"
        node_colors.append(color)

    # Draw nodes and labels
    fig, ax = plt.subplots()
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=2000, ax=ax)
    nx.draw_networkx_labels(G, pos, font_size=10, font_weight="bold", ax=ax)

    # Draw edges with style attributes
    edges = list(G.edges(data=True))
    for u, v, d in edges:
        nx.draw_networkx_edges(
            G,
            pos,
            edgelist=[(u, v)],
            ax=ax,
            edge_color=d.get("color", "gray"),
            style=d.get("style", "solid"),
            width=max(1, d.get("weight", 1) / 10),
        )

    # Creating a legend
    legend_elements = [
        Line2D(
            [0],
            [0],
            marker="o",
            color="w",
            label="Member",
            markerfacecolor="skyblue",
            markersize=15,
        ),
        Line2D(
            [0],
            [0],
            marker="o",
            color="w",
            label="Proposal",
            markerfacecolor="lightgreen",
            markersize=15,
        ),
        Line2D([0], [0], color="green", label="Support", linewidth=3),
        Line2D([0], [0], color="blue", label="Delegation", linestyle="dashed", linewidth=2),
        Line2D([0], [0], color="gray", label="No Support", linewidth=3),
    ]
    for idx, _ in enumerate(communities):
        legend_elements.append(
            Line2D(
                [0],
                [0],
                marker="o",
                color="w",
                label=f"Community {idx+1}",
                markerfacecolor=palette(idx % 10),
                markersize=15,
            )
        )
    plt.legend(handles=legend_elements, loc="upper left")

    if show:
        plt.show()
    return fig
