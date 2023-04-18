import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D


def plot_network_graph(dao):
    G = nx.DiGraph()

    # Adding member and proposal nodes to the graph
    for member in dao.members:
        G.add_node(member.id, node_type=type(member).__name__)

    for proposal in dao.proposals:
        G.add_node(proposal.id, node_type="Proposal")
        for supporter in proposal.supporters:
            G.add_edge(supporter, proposal.id)

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
    edge_colors = []
    for edge in G.edges:
        if edge[0] in G.nodes(data=True)[edge[1]]["supporters"]:
            edge_colors.append("green")
        else:
            edge_colors.append("gray")

    # Drawing the network graph
    nx.draw(
        G,
        pos,
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

    plt.show()
