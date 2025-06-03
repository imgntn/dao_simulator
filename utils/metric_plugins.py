# Metric plugin utilities
import importlib.util
from pathlib import Path
from typing import Callable, Dict, Optional

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

METRIC_REGISTRY: Dict[str, Callable[[object], dict]] = {}


def register_metric(name: str, func: Callable[[object], dict]) -> None:
    """Register a metric callback under ``name``."""
    METRIC_REGISTRY[name] = func


def get_metrics() -> Dict[str, Callable[[object], dict]]:
    return METRIC_REGISTRY


def load_metric_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> None:
    """Import modules from ``directory`` which should call :func:`register_metric`."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)
    for path in dir_path.glob("*.py"):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)


class _MetricReloadHandler(FileSystemEventHandler):
    def __init__(self, directory: str, allowed_dir: Optional[Path]):
        self.directory = directory
        self.allowed_dir = allowed_dir

    def on_modified(self, event):  # pragma: no cover - filesystem watching
        if not event.is_directory and event.src_path.endswith(".py"):
            load_metric_plugins(self.directory, allowed_dir=self.allowed_dir)

    on_created = on_modified


def watch_metric_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> Observer:
    """Watch ``directory`` and reload metric plugins on change."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)
    handler = _MetricReloadHandler(directory, allowed_dir)
    observer = Observer()
    observer.schedule(handler, str(dir_path), recursive=False)
    observer.start()
    return observer
