import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D


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

    pos = nx.spring_layout(G)

    # Customizing node colors based on node_type
    node_colors = []
    for node in G.nodes(data=True):
        node_type = node[1]["node_type"]
        if node_type == "Proposal":
            node_colors.append("lightgreen")
        else:
            node_colors.append("skyblue")

    # Customizing edge colors based on support
    edge_colors = [data.get("color", "gray") for _, _, data in G.edges(data=True)]

    # Drawing the network graph
    fig, ax = plt.subplots()
    nx.draw(
        G,
        pos,
        ax=ax,
        with_labels=True,
        node_size=2000,
        node_color=node_colors,
        edge_color=edge_colors,
        font_size=10,
        font_weight="bold",
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
        Line2D([0], [0], color="gray", label="No Support", linewidth=3),
    ]
    plt.legend(handles=legend_elements, loc="upper left")

    if show:
        plt.show()
    return fig
