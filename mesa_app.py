import sys
from dao_simulation import DAOSimulation

# Mesa visualization imports are optional because the full mesa
# visualization stack (which includes solara) might not always be
# installed when running the tests. We only import them when the
# application is executed directly.
try:
    from mesa.visualization import SolaraViz, make_space_component
except Exception:  # pragma: no cover - visualization only
    SolaraViz = None
    make_space_component = None


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


def agent_portrayal(agent):
    """Return portrayal dict for an agent."""
    return {
        "color": AGENT_COLORS.get(type(agent).__name__, "#000000"),
        "size": 10,
        "label": f"{type(agent).__name__}_{agent.unique_id}",
    }


def create_visualization():
    """Create the visualization page."""
    if SolaraViz is None:
        return None
    
    # Create model with minimal agents to prevent performance issues
    model = DAOSimulation(
        num_developers=5,
        num_investors=3,
        num_delegators=2,
        num_proposal_creators=2,
        num_validators=2,
        num_service_providers=1,
        num_arbitrators=1,
        num_regulators=1,
        num_external_partners=1,
        num_passive_members=3,
        enable_marketing=False,
        event_logging=False
    )
    
    return SolaraViz(
        model,
        components=[make_space_component(agent_portrayal)],
        name="DAO Simulation Visualization",
        # Disable auto-play to prevent continuous stepping
        play_interval=None,
    )


# Create the page for Solara to serve
page = create_visualization()


def launch_server(port: int = 8521):  # pragma: no cover - visualization only
    if SolaraViz is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")
    
    # Launch with subprocess to control port
    import subprocess
    import os
    
    subprocess.run([
        sys.executable, "-m", "solara", "run", 
        os.path.abspath(__file__), "--port", str(port)
    ], check=True)


if __name__ == "__main__":  # pragma: no cover - manual usage
    # When run directly, parse port from first numeric argument
    port = 8521
    for arg in sys.argv[1:]:
        if arg.isdigit():
            port = int(arg)
            break
    launch_server(port)
