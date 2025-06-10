from __future__ import annotations
from pathlib import Path
from typing import Dict, Optional, Type

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


class GovernanceRule:
    """Base class for governance approval rules."""

    def approve(self, proposal, dao) -> bool:  # pragma: no cover - abstract
        """Return ``True`` to approve ``proposal``."""
        raise NotImplementedError


RULE_REGISTRY: Dict[str, Type[GovernanceRule]] = {}


def register_rule(name: str, rule_cls: Type[GovernanceRule]) -> None:
    """Register ``rule_cls`` under ``name``.

    Existing classes are updated in place to support hot reloading.
    """
    existing = RULE_REGISTRY.get(name)
    if existing is not None:
        for attr, val in vars(rule_cls).items():
            if not attr.startswith("__") or attr == "__doc__":
                setattr(existing, attr, val)
    else:
        RULE_REGISTRY[name] = rule_cls


def get_rule(name: str) -> Optional[Type[GovernanceRule]]:
    return RULE_REGISTRY.get(name)


def load_governance_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> None:
    """Import modules from ``directory`` and register contained rules."""
    import importlib.util

    dir_path = validate_directory(directory, allowed_base=allowed_dir)

    for path in dir_path.glob("*.py"):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for obj in module.__dict__.values():
                if isinstance(obj, type) and issubclass(obj, GovernanceRule) and obj is not GovernanceRule:
                    register_rule(obj.__name__.lower(), obj)


class _RuleReloadHandler(FileSystemEventHandler):
    def __init__(self, directory: str, allowed_dir: Optional[Path]) -> None:
        self.directory = directory
        self.allowed_dir = allowed_dir

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".py"):
            load_governance_plugins(self.directory, allowed_dir=self.allowed_dir)

    on_created = on_modified


def watch_governance_plugins(directory: str, *, allowed_dir: Optional[Path] = None) -> Observer:
    """Watch ``directory`` and reload governance plugins on change."""
    dir_path = validate_directory(directory, allowed_base=allowed_dir)
    handler = _RuleReloadHandler(directory, allowed_dir)
    observer = Observer()
    observer.schedule(handler, str(dir_path), recursive=False)
    observer.start()
    return observer


class MajorityRule(GovernanceRule):
    """Approve proposals with a simple majority of votes."""

    def approve(self, proposal, dao) -> bool:  # pragma: no cover - simple logic
        return proposal.votes_for > proposal.votes_against


# register default rule
register_rule("majority", MajorityRule)
