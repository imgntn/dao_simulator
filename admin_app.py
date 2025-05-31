# Basic admin panel using Mesa's sliders to configure the simulation.

try:
    from mesa.visualization.ModularVisualization import ModularServer
    from mesa.visualization.UserParam import UserSettableParameter
except Exception:  # pragma: no cover - visualization only
    ModularServer = None
    UserSettableParameter = None

from dao_simulation import DAOSimulation
from settings import settings


def launch_admin(port: int = 8522):  # pragma: no cover - manual usage
    if ModularServer is None or UserSettableParameter is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")

    model_params = {
        "num_developers": UserSettableParameter(
            "slider",
            "Developers",
            settings["num_developers"],
            0,
            20,
            1,
        ),
        "num_investors": UserSettableParameter(
            "slider",
            "Investors",
            settings["num_investors"],
            0,
            20,
            1,
        ),
        "num_delegators": UserSettableParameter(
            "slider",
            "Delegators",
            settings["num_delegators"],
            0,
            20,
            1,
        ),
        "num_proposal_creators": UserSettableParameter(
            "slider",
            "Creators",
            settings["num_proposal_creators"],
            0,
            20,
            1,
        ),
        "num_validators": UserSettableParameter(
            "slider",
            "Validators",
            settings["num_validators"],
            0,
            20,
            1,
        ),
        "num_service_providers": UserSettableParameter(
            "slider",
            "Service Providers",
            settings["num_service_providers"],
            0,
            20,
            1,
        ),
        "num_arbitrators": UserSettableParameter(
            "slider",
            "Arbitrators",
            settings["num_arbitrators"],
            0,
            10,
            1,
        ),
        "num_regulators": UserSettableParameter(
            "slider",
            "Regulators",
            settings["num_regulators"],
            0,
            10,
            1,
        ),
        "num_external_partners": UserSettableParameter(
            "slider",
            "External Partners",
            settings["num_external_partners"],
            0,
            10,
            1,
        ),
        "num_passive_members": UserSettableParameter(
            "slider",
            "Passive Members",
            settings["num_passive_members"],
            0,
            20,
            1,
        ),
        "comment_probability": UserSettableParameter(
            "slider",
            "Comment Probability",
            settings["comment_probability"],
            0.0,
            1.0,
            0.05,
        ),
        "external_partner_interact_probability": UserSettableParameter(
            "slider",
            "Partner Interaction",
            settings["external_partner_interact_probability"],
            0.0,
            1.0,
            0.05,
        ),
        "violation_probability": UserSettableParameter(
            "slider",
            "Violation Probability",
            settings["violation_probability"],
            0.0,
            1.0,
            0.05,
        ),
        "reputation_penalty": UserSettableParameter(
            "slider",
            "Reputation Penalty",
            settings["reputation_penalty"],
            0,
            20,
            1,
        ),
    }

    server = ModularServer(DAOSimulation, [], "DAO Admin Panel", model_params)
    server.port = port
    server.launch()


if __name__ == "__main__":  # pragma: no cover - manual usage
    launch_admin()
