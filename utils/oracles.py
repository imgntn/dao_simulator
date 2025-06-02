from __future__ import annotations

from pathlib import Path
from typing import Protocol, Optional, Dict, Type

from .path_utils import validate_directory
import importlib.util


class PriceOracle(Protocol):
    """Interface for price oracle implementations."""

    def update_prices(self, treasury, *args, **kwargs) -> None:
        ...


class RandomWalkOracle:
    """Default oracle using a random walk model."""

    def __init__(self, volatility: float = 0.05) -> None:
        self.volatility = volatility

    def update_prices(self, treasury, *_, **kwargs) -> None:
        import random

        vol = kwargs.get("volatility", self.volatility)
        for token, price in list(treasury.token_prices.items()):
            change = random.uniform(-vol, vol)
            pressure = treasury._price_pressure.get(token, 0.0)
            if pressure:
                change += 0.01 * (pressure / max(treasury.tokens[token], 1))
            new_price = price * (1 + change)
            treasury.token_prices[token] = max(new_price, 0.01)
        treasury._price_pressure.clear()


ORACLE_REGISTRY: Dict[str, Type[PriceOracle]] = {}


def register_oracle(name: str, oracle_cls: Type[PriceOracle]) -> None:
    ORACLE_REGISTRY[name] = oracle_cls


def get_oracle(name: str):
    return ORACLE_REGISTRY.get(name)


def load_oracle_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> None:
    """Import modules from ``directory`` and register contained oracle classes."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)

    for path in dir_path.glob("*.py"):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for obj in module.__dict__.values():
                if isinstance(obj, type) and hasattr(obj, "update_prices"):
                    register_oracle(obj.__name__.lower(), obj)
