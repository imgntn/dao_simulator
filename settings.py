"""Configuration helpers for the simulation.

This module exposes a simple ``settings`` dictionary containing the number of
each type of agent created in :class:`dao_simulation.DAOSimulation`.  Tweaking
these numbers in tests or in user code previously required direct mutation of
the dictionary.  To make customisation easier a small helper function is
provided.
"""

settings = {
    "num_developers": 10,
    "num_investors": 5,
    "num_delegators": 5,
    "num_proposal_creators": 5,
    "num_validators": 5,
    "num_service_providers": 5,
    "num_arbitrators": 2,
    "num_regulators": 2,
    "num_auditors": 0,
    "num_external_partners": 2,
    "num_passive_members": 10,
    "violation_probability": 0.1,
    "reputation_penalty": 5,
    "comment_probability": 0.5,
    "external_partner_interact_probability": 0.0,
    "staking_interest_rate": 0.0,
    "slash_fraction": 0.0,
}


def update_settings(**kwargs):
    """Update the global ``settings`` dictionary.

    Parameters are passed as keyword arguments and must correspond to an
    existing key in ``settings``.  Unknown keys raise ``KeyError`` so that typos
    are caught early.
    """

    for key, value in kwargs.items():
        if key not in settings:
            raise KeyError(f"Unknown setting: {key}")
        settings[key] = value

    return settings


from pathlib import Path
from typing import Optional

from utils.path_utils import validate_file


def load_settings(path: str, *, allowed_dir: Optional[Path] = None):
    """Load settings from a JSON or YAML file."""
    import json

    file_path = validate_file(path, allowed_base=allowed_dir)

    if file_path.suffix in (".yaml", ".yml"):
        try:
            import yaml  # type: ignore
        except Exception as e:  # pragma: no cover - optional dep
            raise ImportError("PyYAML is required for YAML configs") from e
        with open(file_path, "r") as f:
            data = yaml.safe_load(f) or {}
    else:
        with open(file_path, "r") as f:
            data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("Config file must contain a mapping")

    return update_settings(**data)
