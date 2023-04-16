import geopandas as gpd
import matplotlib.pyplot as plt

def draw_choropleth_map(model, world_shapefile_path, anonymous_location):
    world = gpd.read_file(world_shapefile_path)
    agent_locations = []

    for agent in model.schedule.agents:
        if agent.location != anonymous_location:
            agent_locations.append(agent.location)

    location_counts = {loc: agent_limport geopandas as gpd
import pandas as pd
import matplotlib.pyplot as plt

def visualize_choropleth_map(model):
    world = gpd.read_file(gpd.datasets.get_path("naturalearth_lowres"))

    member_locations = pd.DataFrame(columns=["country", "count"])

    for member in model.dao.members:
        if member.location is not None:
            member_locations.loc[len(member_locations)] = [member.location, 1]

    member_locations = member_locations.groupby("country").sum().reset_index()

    world_with_data = world.merge(member_locations, left_on="iso_a3", right_on="country", how="left").fillna(0)

    fig, ax = plt.subplots(1, figsize=(20, 12))
    world_with_data.plot(column="count", cmap="coolwarm_r", linewidth=0.8, ax=ax, edgecolor="0.8", legend=True)

    ax.set_title("DAO Members by Country")
    plt.show()

if __name__ == "__main__":
    from model.dao_model import DAOModel

    # Instantiate the DAOModel with sample agents
    model = DAOModel(n_agents=30)

    # Simulate the model for some steps
    for _ in range(50):
        model.step()

    # Visualize the choropleth map
    visualize_choropleth_map(model)
ocations.count(loc) for loc in set(agent_locations)}

    world['agent_counts'] = world.apply(lambda row: location_counts.get(row['ISO_A3'], 0), axis=1)
    world.boundary.plot(color='black', linewidth=1, figsize=(15, 10))
    world.plot(column='agent_counts', cmap='OrRd', linewidth=0.8, figsize=(15, 10), legend=True)
    plt.title("Agent Locations")
    plt.show()
