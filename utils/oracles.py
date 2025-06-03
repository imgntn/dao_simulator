from __future__ import annotations

from pathlib import Path
from typing import Protocol, Optional, Dict, Type
try:  # pragma: no cover - optional dependency
    from watchdog.observers import Observer
    from watchdog.observers.polling import PollingObserver
    from watchdog.events import FileSystemEventHandler
except Exception:  # pragma: no cover - fallback when watchdog not installed
    class FileSystemEventHandler:
        pass

    class Observer:
        def schedule(self, *_, **__):
            pass

        def start(self):
            pass

        def stop(self):
            pass

        def join(self, timeout=None):
            pass

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


class GeometricBrownianOracle:
    """Oracle using a geometric Brownian motion model."""

    def __init__(self, drift: float = 0.0, volatility: float = 0.05) -> None:
        self.drift = drift
        self.volatility = volatility

    def update_prices(self, treasury, *_, **kwargs) -> None:
        import random, math

        mu = kwargs.get("drift", self.drift)
        vol = kwargs.get("volatility", self.volatility)
        for token, price in list(treasury.token_prices.items()):
            pressure = treasury._price_pressure.get(token, 0.0)
            adj_mu = mu
            if pressure:
                adj_mu += 0.01 * (pressure / max(treasury.tokens[token], 1))
            noise = random.gauss(0, 1)
            factor = math.exp((adj_mu - 0.5 * vol ** 2) + vol * noise)
            new_price = price * factor
            treasury.token_prices[token] = max(new_price, 0.01)
        treasury._price_pressure.clear()


ORACLE_REGISTRY: Dict[str, Type[PriceOracle]] = {}


def register_oracle(name: str, oracle_cls: Type[PriceOracle]) -> None:
    """Register ``oracle_cls`` under ``name`` and update existing class."""
    existing = ORACLE_REGISTRY.get(name)
    if existing is not None:
        for attr, val in vars(oracle_cls).items():
            if attr.startswith("__") and attr != "__doc__":
                continue
            if hasattr(existing, attr):
                orig = getattr(existing, attr)
                if callable(orig) and callable(val):
                    try:
                        orig.__code__ = val.__code__
                        orig.__defaults__ = val.__defaults__
                        continue
                    except Exception:
                        pass
            setattr(existing, attr, val)
    else:
        ORACLE_REGISTRY[name] = oracle_cls


def get_oracle(name: str):
    return ORACLE_REGISTRY.get(name)


def load_oracle_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> None:
    """Import modules from ``directory`` and register contained oracle classes."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)

    for path in dir_path.glob("*.py"):
        module = importlib.util.module_from_spec(
            importlib.machinery.ModuleSpec(path.stem, None)
        )
        with open(path) as f:
            code = f.read()
        exec(compile(code, str(path), "exec"), module.__dict__)
        for obj in module.__dict__.values():
            if isinstance(obj, type) and hasattr(obj, "update_prices"):
                register_oracle(obj.__name__.lower(), obj)


class _OracleReloadHandler(FileSystemEventHandler):
    def __init__(self, directory: str, allowed_dir: Optional[Path]) -> None:
        self.directory = directory
        self.allowed_dir = allowed_dir

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".py"):
            load_oracle_plugins(self.directory, allowed_dir=self.allowed_dir)

    on_created = on_modified


def watch_oracle_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> Observer:
    """Watch ``directory`` and reload oracle plugins on change."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)
    handler = _OracleReloadHandler(directory, allowed_dir)
    # ``PollingObserver`` avoids issues with virtualised filesystems in tests
    import threading, time

    observer = PollingObserver(timeout=0.1) if 'PollingObserver' in globals() else Observer()
    observer.schedule(handler, str(dir_path), recursive=False)
    observer.start()

    running = True

    def poll():
        while running:
            try:
                load_oracle_plugins(directory, allowed_dir=allowed_dir)
            except Exception:
                pass
            time.sleep(0.5)

    thread = threading.Thread(target=poll, daemon=True)
    thread.start()

    orig_stop = observer.stop

    def stop():
        nonlocal running
        running = False
        orig_stop()
        thread.join()

    observer.stop = stop  # type: ignore[assignment]
    observer.stop_and_join = stop  # backwards compat
    return observer


register_oracle("randomwalkoracle", RandomWalkOracle)
register_oracle("geometricbrownianoracle", GeometricBrownianOracle)
