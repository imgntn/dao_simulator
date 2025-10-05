from pathlib import Path
import importlib.util
from typing import Type, Dict, Optional
try:  # pragma: no cover - optional dependency
    from watchdog.observers import Observer
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

from agents.dao_member import DAOMember

AGENT_REGISTRY: Dict[str, Type[DAOMember]] = {}


def register_agent(name: str, cls: Type[DAOMember]) -> None:
    """Register an agent class under ``name``."""
    AGENT_REGISTRY[name] = cls


def get_agent(name: str):
    return AGENT_REGISTRY.get(name)


def load_agent_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> None:
    """Import modules from ``directory`` and register contained agent classes.

    Parameters
    ----------
    directory:
        Directory containing agent plugins.
    allowed_dir:
        If provided, ``directory`` must be inside this path.
    """
    dir_path = validate_directory(directory, allowed_base=allowed_dir)

    for path in dir_path.glob("*.py"):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for obj in module.__dict__.values():
                if isinstance(obj, type) and issubclass(obj, DAOMember):
                    register_agent(obj.__name__.lower(), obj)


class _PluginReloadHandler(FileSystemEventHandler):
    def __init__(self, directory: str, allowed_dir: Optional[Path]) -> None:
        self.directory = directory
        self.allowed_dir = allowed_dir

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".py"):
            load_agent_plugins(self.directory, allowed_dir=self.allowed_dir)

    on_created = on_modified


def watch_agent_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> Observer:
    """Watch ``directory`` and reload agent plugins on change."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)
    handler = _PluginReloadHandler(directory, allowed_dir)
    observer = Observer()
    observer.schedule(handler, str(dir_path), recursive=False)
    observer.start()
    return observer
