# For this example, we'll assume that the DAO members have a 'location' attribute indicating their country of origin.

import geopandas as gpd
import matplotlib.pyplot as plt
from shapely.geometry import Polygon


def plot_choropleth_map(dao, show=True):
    try:
        from geodatasets import get_path
        world = gpd.read_file(get_path("naturalearth.lowres"))
    except Exception:
        # Fallback to a simple world polygon when sample data is unavailable
        geom = [Polygon([(-180, -90), (-180, 90), (180, 90), (180, -90)])]
        world = gpd.GeoDataFrame({"iso_a3": ["ALL"], "num_members": [0]}, geometry=geom, crs="EPSG:4326")
    member_locations = {}

    for member in dao.members:
        if member.location in member_locations:
            member_locations[member.location] += 1
        else:
            member_locations[member.location] = 1

    if "num_members" not in world.columns:
        world["num_members"] = 0
    world["num_members"] = world["iso_a3"].map(member_locations).fillna(world["num_members"])
    ax = world.plot(column="num_members", cmap="coolwarm", legend=True, figsize=(15, 10))
    fig = ax.get_figure()
    if show:
        plt.show()
    return fig
