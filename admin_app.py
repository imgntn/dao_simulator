# Basic admin panel using Mesa's sliders to configure the simulation.

try:
    from mesa.visualization.ModularVisualization import ModularServer
    from mesa.visualization.UserParam import UserSettableParameter
except Exception:  # pragma: no cover - visualization only
    ModularServer = None
    UserSettableParameter = None

from dao_simulation import DAOSimulation


def launch_admin(port: int = 8522):  # pragma: no cover - manual usage
    if ModularServer is None or UserSettableParameter is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")

    model_params = {
        "num_developers": UserSettableParameter("slider", "Developers", 5, 0, 20, 1),
        "num_investors": UserSettableParameter("slider", "Investors", 5, 0, 20, 1),
        "num_delegators": UserSettableParameter("slider", "Delegators", 5, 0, 20, 1),
        "num_proposal_creators": UserSettableParameter("slider", "Creators", 5, 0, 20, 1),
        "num_validators": UserSettableParameter("slider", "Validators", 5, 0, 20, 1),
        "num_service_providers": UserSettableParameter("slider", "Service Providers", 5, 0, 20, 1),
        "num_arbitrators": UserSettableParameter("slider", "Arbitrators", 2, 0, 10, 1),
        "num_regulators": UserSettableParameter("slider", "Regulators", 2, 0, 10, 1),
        "num_external_partners": UserSettableParameter("slider", "External Partners", 2, 0, 10, 1),
        "num_passive_members": UserSettableParameter("slider", "Passive Members", 10, 0, 20, 1),
        "comment_probability": UserSettableParameter("slider", "Comment Probability", 0.5, 0.0, 1.0, 0.05),
        "external_partner_interact_probability": UserSettableParameter("slider", "Partner Interaction", 0.0, 0.0, 1.0, 0.05),
        "violation_probability": UserSettableParameter("slider", "Violation Probability", 0.1, 0.0, 1.0, 0.05),
        "reputation_penalty": UserSettableParameter("slider", "Reputation Penalty", 5, 0, 20, 1),
    }

    server = ModularServer(DAOSimulation, [], "DAO Admin Panel", model_params)
    server.port = port
    server.launch()


if __name__ == "__main__":  # pragma: no cover - manual usage
    launch_admin()
