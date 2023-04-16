import networkx as nx
import matplotlib.pyplot as plt

def draw_network_graph(model):
    G = nx.Graph()
    for agent in model.schedule.agents:
        G.add_node(agent.unique_id)
        for neighbor in model.grid.get_neighbors(agent):
            G.add_edge(agent.unique_id, neighbor.unique_id)

    nx.draw(G, with_labels=True, node_color="skyblue", node_size=1000, font_size=10, font_color="k", font_weight="bold")
    plt.show()
