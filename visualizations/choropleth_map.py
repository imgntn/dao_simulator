import geopandas as gpd
import matplotlib.pyplot as plt

def draw_choropleth_map(model, world_shapefile_path, anonymous_location):
    world = gpd.read_file(world_shapefile_path)
    agent_locations = []

    for agent in model.schedule.agents:
        if agent.location != anonymous_location:
            agent_locations.append(agent.location)

    location_counts = {loc: agent_locations.count(loc) for loc in set(agent_locations)}

    world['agent_counts'] = world.apply(lambda row: location_counts.get(row['ISO_A3'], 0), axis=1)
    world.boundary.plot(color='black', linewidth=1, figsize=(15, 10))
    world.plot(column='agent_counts', cmap='OrRd', linewidth=0.8, figsize=(15, 10), legend=True)
    plt.title("Agent Locations")
    plt.show()
