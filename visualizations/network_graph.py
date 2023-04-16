import networkx as nx
import matplotlib.pyplot as plt

def visualize_network_graph(model):
    G = nx.Graph()

    for member in model.dao.members:
        G.add_node(member.unique_id, label=type(member).__name__)

    for member in model.dao.members:
        for other_member in model.dao.members:
            if member != other_member:
                if other_member in member.relationships:
                    G.add_edge(member.unique_id, other_member.unique_id)

    pos = nx.spring_layout(G)
    labels = nx.get_node_attributes(G, 'label')

    plt.figure(figsize=(12, 12))
    nx.draw(G, pos, node_color='skyblue', with_labels=True, labels=labels)
    plt.title("DAO Network Graph")
    plt.show()

if __name__ == "__main__":
    from model.dao_model import DAOModel

    # Instantiate the DAOModel with sample agents
    model = DAOModel(n_agents=30)

    # Simulate the model for some steps
    for _ in range(50):
        model.step()

    # Visualize the network graph
    visualize_network_graph(model)
