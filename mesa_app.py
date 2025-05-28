from dao_simulation import DAOSimulation

# Mesa visualization imports are optional because the full mesa
# visualization stack (which includes solara) might not always be
# installed when running the tests. We only import them when the
# application is executed directly.
try:
    from mesa.visualization.ModularVisualization import ModularServer
    from mesa.visualization.modules import NetworkModule
except Exception:  # pragma: no cover - visualization only
    ModularServer = None
    NetworkModule = None


AGENT_COLORS = {
    "Developer": "#1f77b4",
    "Investor": "#2ca02c",
    "Delegator": "#ff7f0e",
    "ProposalCreator": "#9467bd",
    "Validator": "#d62728",
    "ServiceProvider": "#8c564b",
    "Arbitrator": "#e377c2",
    "Regulator": "#7f7f7f",
    "ExternalPartner": "#bcbd22",
    "PassiveMember": "#17becf",
    "Proposal": "#98df8a",
}


def network_portrayal(model):
    """Return nodes and edges for the current DAO state."""
    nodes = []
    edges = []
    for member in model.dao.members:
        nodes.append(
            {
                "id": member.unique_id,
                "label": member.unique_id,
                "color": AGENT_COLORS.get(type(member).__name__, "#000000"),
            }
        )

    for proposal in model.dao.proposals:
        prop_id = proposal.title
        nodes.append({"id": prop_id, "label": prop_id, "color": AGENT_COLORS["Proposal"]})
        if hasattr(proposal, "creator"):
            edges.append({"source": proposal.creator.unique_id, "target": prop_id})

    return {"nodes": nodes, "edges": edges}


def launch_server(port: int = 8521):  # pragma: no cover - visualization only
    if ModularServer is None or NetworkModule is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")

    network = NetworkModule(network_portrayal, 600, 600)
    server = ModularServer(DAOSimulation, [network], "DAO Simulation")
    server.port = port
    server.launch()


if __name__ == "__main__":  # pragma: no cover - manual usage
    launch_server()
