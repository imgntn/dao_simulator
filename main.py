from model.dao_simulation import DAOSimulation
from visualizations.network_graph import draw_network_graph
from visualizations.choropleth_map import draw_choropleth_map
from visualizations.heatmap import draw_heatmap

num_agents = 50
num_steps = 100

simulation = DAOSimulation(num_agents, num_steps)
results = simulation.run()

# You can use the visualization functions on the simulation model as needed, e.g.:
# draw_network_graph(simulation.model)
# draw_choropleth_map(simulation.model, "/path/to/world/shapefile", "Anonymous")
# draw_heatmap(simulation.model)
