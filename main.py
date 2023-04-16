from model.dao_model import DAOSimulation
from visualizations.network_graph import visualize_network_graph
from visualizations.choropleth_map import visualize_choropleth_map
from visualizations.heatmap import visualize_heatmap

def main():
    # Initialize and run the simulation
    sim = DAOSimulation(num_members=100, width=10, height=10, num_steps=200)
    sim.run_simulation()

    # Visualize the results
    visualize_network_graph(sim.dao)
    visualize_choropleth_map(sim.dao)
    visualize_heatmap(sim.dao)

if __name__ == '__main__':
    main()
