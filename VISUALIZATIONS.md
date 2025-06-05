## network_graph.py

This updated version of network_graph.py customizes node colors based on node type and now draws delegation relationships with dashed edges. Representatives of liquid delegators and delegated proposal support are visualized so influence flows are easier to inspect. The legend explains the new edge style.

## heatmap.py

In this implementation of heatmap.py, we create a heatmap that shows the score based on reputation and token balance for DAO members. The values are normalized and aggregated into a 10x10 grid. The heatmap is colored using a "coolwarm" color map.

## choropleth_map.py

Plots the geographic distribution of members using GeoPandas. When the optional
``geodatasets`` package is available, the map is drawn over real world data; a
simple fallback polygon is used otherwise.

## interactive_line_chart.py and interactive_network.py

Both modules return Plotly figures when ``plotly`` is installed. They mirror the
static charts but allow zooming and tooltips in a notebook or web browser.

## report.py

Combines all visualizations into a single HTML file. The report includes network
graphs, price charts, heatmaps and choropleth maps with embedded images or
interactive figures when available.
