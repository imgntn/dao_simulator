from pathlib import Path
import importlib.util
from typing import Type, Dict

from agents.dao_member import DAOMember

AGENT_REGISTRY: Dict[str, Type[DAOMember]] = {}


def register_agent(name: str, cls: Type[DAOMember]) -> None:
    """Register an agent class under ``name``."""
    AGENT_REGISTRY[name] = cls


def get_agent(name: str):
    return AGENT_REGISTRY.get(name)


def load_agent_plugins(directory: str) -> None:
    """Import modules from ``directory`` and register contained agent classes."""
    for path in Path(directory).glob("*.py"):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for obj in module.__dict__.values():
                if isinstance(obj, type) and issubclass(obj, DAOMember):
                    register_agent(obj.__name__.lower(), obj)
