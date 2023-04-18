# For this example, we'll assume that the DAO members have a 'location' attribute indicating their country of origin.

import geopandas as gpd
import matplotlib.pyplot as plt


def plot_choropleth_map(dao):
    world = gpd.read_file(gpd.datasets.get_path("naturalearth_lowres"))
    member_locations = {}

    for member in dao.members:
        if member.location in member_locations:
            member_locations[member.location] += 1
        else:
            member_locations[member.location] = 1

    world["num_members"] = world["iso_a3"].map(member_locations).fillna(0)
    world.plot(column="num_members", cmap="coolwarm", legend=True, figsize=(15, 10))
    plt.show()
