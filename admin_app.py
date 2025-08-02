"""Admin panel for configuring simulation parameters via sliders."""

import os
import subprocess
import sys

try:  # pragma: no cover - visualization only
    from mesa.visualization import Slider, SolaraViz
except Exception:  # pragma: no cover - visualization only
    Slider = None
    SolaraViz = None

from dao_simulation import DAOSimulation
from settings import settings


def _build_model_params():
    if Slider is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")

    return {
        "num_developers": Slider(
            "Developers",
            value=settings["num_developers"],
            min=0,
            max=20,
            step=1,
        ),
        "num_investors": Slider(
            "Investors",
            value=settings["num_investors"],
            min=0,
            max=20,
            step=1,
        ),
        "num_delegators": Slider(
            "Delegators",
            value=settings["num_delegators"],
            min=0,
            max=20,
            step=1,
        ),
        "num_proposal_creators": Slider(
            "Creators",
            value=settings["num_proposal_creators"],
            min=0,
            max=20,
            step=1,
        ),
        "num_validators": Slider(
            "Validators",
            value=settings["num_validators"],
            min=0,
            max=20,
            step=1,
        ),
        "num_service_providers": Slider(
            "Service Providers",
            value=settings["num_service_providers"],
            min=0,
            max=20,
            step=1,
        ),
        "num_arbitrators": Slider(
            "Arbitrators",
            value=settings["num_arbitrators"],
            min=0,
            max=10,
            step=1,
        ),
        "num_regulators": Slider(
            "Regulators",
            value=settings["num_regulators"],
            min=0,
            max=10,
            step=1,
        ),
        "num_external_partners": Slider(
            "External Partners",
            value=settings["num_external_partners"],
            min=0,
            max=10,
            step=1,
        ),
        "num_passive_members": Slider(
            "Passive Members",
            value=settings["num_passive_members"],
            min=0,
            max=20,
            step=1,
        ),
        "comment_probability": Slider(
            "Comment Probability",
            value=settings["comment_probability"],
            min=0.0,
            max=1.0,
            step=0.05,
        ),
        "external_partner_interact_probability": Slider(
            "Partner Interaction",
            value=settings["external_partner_interact_probability"],
            min=0.0,
            max=1.0,
            step=0.05,
        ),
        "violation_probability": Slider(
            "Violation Probability",
            value=settings["violation_probability"],
            min=0.0,
            max=1.0,
            step=0.05,
        ),
        "reputation_penalty": Slider(
            "Reputation Penalty",
            value=settings["reputation_penalty"],
            min=0,
            max=20,
            step=1,
        ),
    }


def build_page():  # pragma: no cover - manual usage
    if SolaraViz is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")

    model_params = _build_model_params()
    model = DAOSimulation()
    return SolaraViz(model, model_params=model_params, name="DAO Admin Panel")


page = build_page() if Slider and SolaraViz else None


def launch_admin(port: int = 8522):  # pragma: no cover - manual usage
    if Slider is None or SolaraViz is None:
        raise RuntimeError("Mesa visualization dependencies are not installed.")

    subprocess.run(
        [
            sys.executable,
            "-m",
            "solara",
            "run",
            os.path.abspath(__file__),
            "--port",
            str(port),
        ],
        check=True,
    )


if (
    __name__ == "__main__" and "SOLARA_APP" not in os.environ
):  # pragma: no cover - manual usage
    launch_admin()
