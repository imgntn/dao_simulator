import networkx as nx
import hashlib
from utils import layout_worker
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from networkx.algorithms.community import greedy_modularity_communities


_LAST_NETWORK: dict | None = None


def _make_signature(nodes, edges):
    m = hashlib.sha1()
    m.update(str(len(nodes)).encode())
    m.update(str(len(edges)).encode())
    m.update(
        ",".join(sorted(str(n["id"]) for n in nodes)).encode()
    )
    return m.hexdigest()[:12]


def compute_network_data(dao, *, max_layout_nodes: int = 500, seed: int = 42, cluster_threshold: int = 1000):
    """Return nodes and edges describing the current delegation network.

    Compute 2D positions for nodes when the graph is not too large. For
    larger graphs a deterministic grid layout is used.
    """
    nodes = []
    edges = []
    for member in dao.members:
        nodes.append({"id": member.unique_id, "type": "member"})
        rep = getattr(member, "representative", None)
        if rep is not None:
            edges.append({"source": member.unique_id, "target": rep.unique_id, "type": "representative"})
        if hasattr(member, "delegations"):
            for prop, amount in member.delegations.items():
                edges.append({"source": member.unique_id, "target": prop.title, "type": "delegation", "weight": amount})
    for proposal in dao.proposals:
        nodes.append({"id": proposal.title, "type": "proposal"})
        if hasattr(proposal, "creator"):
            edges.append({"source": proposal.creator.unique_id, "target": proposal.title, "type": "created"})

    
    total_nodes = len(nodes)
    total_edges = len(edges)
    signature = _make_signature(nodes, edges)

    # Try to use a cached higher-quality layout if available; otherwise
    # submit a background job and fall back to a quick layout.
    cached = None
    try:
        cached = layout_worker.get_cached_layout(signature)
    except Exception:
        cached = None
    if cached is not None:
        # Map cached positions into nodes
        xs = [p[0] for p in cached.values()]
        ys = [p[1] for p in cached.values()]
        minx, maxx = min(xs), max(xs)
        miny, maxy = min(ys), max(ys)
        spanx = maxx - minx if maxx > minx else 1.0
        spany = maxy - miny if maxy > miny else 1.0
        for n in nodes:
            x, y = cached.get(n["id"], (0.0, 0.0))
            n["position"] = [ (x - minx) / spanx * 100.0, (y - miny) / spany * 100.0 ]
    elif total_nodes and total_nodes <= max_layout_nodes:
        try:
            G = nx.DiGraph()
            for n in nodes:
                G.add_node(n["id"]) 
            for e in edges:
                G.add_edge(e["source"], e["target"])
            pos = nx.spring_layout(G, seed=seed)
            xs = [p[0] for p in pos.values()]
            ys = [p[1] for p in pos.values()]
            minx, maxx = min(xs), max(xs)
            miny, maxy = min(ys), max(ys)
            spanx = maxx - minx if maxx > minx else 1.0
            spany = maxy - miny if maxy > miny else 1.0
            for n in nodes:
                x, y = pos.get(n["id"], (0.0, 0.0))
                n["position"] = [ (x - minx) / spanx * 100.0, (y - miny) / spany * 100.0 ]
        except Exception:
            cols = int(total_nodes**0.5) + 1
            spacing = 10
            for i, n in enumerate(nodes):
                col = i % cols
                row = i // cols
                n["position"] = [col * spacing, row * spacing, 0]
    else:
        # Large graphs: request a background high-quality layout and use a
        # deterministic grid for now. Also compute clusters for LOD.
        try:
            layout_worker.submit_layout(nodes, edges)
        except Exception:
            pass
        cols = int(total_nodes**0.5) + 1 if total_nodes else 1
        spacing = 8
        for i, n in enumerate(nodes):
            col = i % cols
            row = i // cols
            n["position"] = [col * spacing, row * spacing, 0]

    # Clustering / LOD: if the graph is large, identify communities and
    # emit a clusters list alongside the raw nodes/edges. Clients may choose
    # to render clusters instead of individual nodes.
    clusters = None
    if total_nodes > cluster_threshold:
        try:
            Gc = nx.Graph()
            for n in nodes:
                Gc.add_node(n["id"]) 
            for e in edges:
                if e["source"] in Gc and e["target"] in Gc:
                    Gc.add_edge(e["source"], e["target"])
            comms = list(greedy_modularity_communities(Gc))
            clusters = []
            for idx, comm in enumerate(comms):
                members = list(comm)
                # centroid
                xs = [n["position"][0] for n in nodes if n["id"] in members]
                ys = [n["position"][1] for n in nodes if n["id"] in members]
                if xs and ys:
                    cx = sum(xs) / len(xs)
                    cy = sum(ys) / len(ys)
                else:
                    cx = cy = 0
                clusters.append({"id": f"cluster_{idx}", "members": members, "size": len(members), "position": [cx, cy, 0]})
        except Exception:
            clusters = None
    else:
        # Grid layout for large graphs.
        cols = int(total_nodes**0.5) + 1 if total_nodes else 1
        spacing = 8
        for i, n in enumerate(nodes):
            col = i % cols
            row = i // cols
            n["position"] = [col * spacing, row * spacing, 0]

    # Compute diffs vs last emitted network to reduce transfer size
    global _LAST_NETWORK
    added_nodes = []
    removed_nodes = []
    added_edges = []
    removed_edges = []
    try:
        if _LAST_NETWORK is None:
            added_nodes = nodes
            added_edges = edges
        else:
            last_node_ids = {n["id"] for n in _LAST_NETWORK.get("nodes", [])}
            cur_node_ids = {n["id"] for n in nodes}
            added_nodes = [n for n in nodes if n["id"] not in last_node_ids]
            removed_nodes = [n for n in _LAST_NETWORK.get("nodes", []) if n["id"] not in cur_node_ids]

            def _edge_key(e):
                return (e.get("source"), e.get("target"), e.get("type"))

            last_edges_set = {_edge_key(e) for e in _LAST_NETWORK.get("edges", [])}
            cur_edges_set = {_edge_key(e) for e in edges}
            added_edges = [e for e in edges if _edge_key(e) not in last_edges_set]
            removed_edges = [e for e in _LAST_NETWORK.get("edges", []) if _edge_key(e) not in cur_edges_set]
    except Exception:
        added_nodes = nodes
        added_edges = edges

    _LAST_NETWORK = {"nodes": nodes, "edges": edges}

    payload = {"nodes": nodes, "edges": edges, "added_nodes": added_nodes, "removed_nodes": removed_nodes, "added_edges": added_edges, "removed_edges": removed_edges}
    if clusters is not None:
        payload["clusters"] = clusters
        # When clusters are present, emit visible_nodes/edges as the cluster-level
        # aggregation so clients can render an aggregated view immediately.
        visible_nodes = [{"id": c["id"], "type": "cluster", "size": c["size"], "position": c["position"]} for c in clusters]
        # Build aggregated edges between clusters if members have cross-cluster links
        cluster_index = {m: c["id"] for c in clusters for m in c["members"]}
        agg_edges = {}
        for e in edges:
            s = cluster_index.get(e["source"])
            t = cluster_index.get(e["target"])
            if s is None or t is None:
                continue
            key = (s, t)
            agg_edges[key] = agg_edges.get(key, 0) + 1
        visible_edges = [{"source": k[0], "target": k[1], "type": "aggregated", "weight": w} for k, w in agg_edges.items()]
        payload["visible_nodes"] = visible_nodes
        payload["visible_edges"] = visible_edges

    return payload


def plot_network_graph(dao, show=True):
    G = nx.DiGraph()

    # Adding member and proposal nodes to the graph
    for member in dao.members:
        G.add_node(member.unique_id, node_type=type(member).__name__)

    for proposal in dao.proposals:
        prop_id = proposal.title
        G.add_node(prop_id, node_type="Proposal")
        if hasattr(proposal, "creator"):
            G.add_edge(proposal.creator.unique_id, prop_id)

    # Delegation links
    delegation_edges = []
    for member in dao.members:
        if hasattr(member, "delegations"):
            for prop, amount in member.delegations.items():
                delegation_edges.append((member.unique_id, prop.title, {"weight": amount, "style": "dashed", "color": "blue"}))
        rep = getattr(member, "representative", None)
        if rep is not None:
            delegation_edges.append((member.unique_id, rep.unique_id, {"style": "dashed", "color": "purple"}))
    for u, v, d in delegation_edges:
        G.add_edge(u, v, **d)

    pos = nx.spring_layout(G)

    communities = []
    try:
        communities = list(greedy_modularity_communities(G))
    except Exception:
        communities = []
    community_map = {}
    for idx, comm in enumerate(communities):
        for n in comm:
            community_map[n] = idx

    # Using ``plt.get_cmap`` avoids the Matplotlib ``get_cmap`` deprecation
    # warning triggered during tests.
    palette = plt.get_cmap("tab10")
    node_colors = []
    for node in G.nodes(data=True):
        node_type = node[1]["node_type"]
        if node[0] in community_map:
            color = palette(community_map[node[0]] % 10)
        elif node_type == "Proposal":
            color = "lightgreen"
        else:
            color = "skyblue"
        node_colors.append(color)

    # Draw nodes and labels. Close any previously open figures first to
    # prevent matplotlib from accumulating them during automated tests.
    plt.close("all")
    fig, ax = plt.subplots()
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=2000, ax=ax)
    nx.draw_networkx_labels(G, pos, font_size=10, font_weight="bold", ax=ax)

    # Draw edges with style attributes
    edges = list(G.edges(data=True))
    for u, v, d in edges:
        nx.draw_networkx_edges(
            G,
            pos,
            edgelist=[(u, v)],
            ax=ax,
            edge_color=d.get("color", "gray"),
            style=d.get("style", "solid"),
            width=max(1, d.get("weight", 1) / 10),
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
        Line2D([0], [0], color="blue", label="Delegation", linestyle="dashed", linewidth=2),
        Line2D([0], [0], color="gray", label="No Support", linewidth=3),
    ]
    for idx, _ in enumerate(communities):
        legend_elements.append(
            Line2D(
                [0],
                [0],
                marker="o",
                color="w",
                label=f"Community {idx+1}",
                markerfacecolor=palette(idx % 10),
                markersize=15,
            )
        )
    plt.legend(handles=legend_elements, loc="upper left")

    if show:
        plt.show()
    # Close the figure to avoid warnings about too many open figures.
    # Returning the figure still lets callers inspect it.
    plt.close(fig)
    return fig
