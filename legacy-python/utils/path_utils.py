from pathlib import Path
from typing import Optional


def validate_directory(path_str: str, *, allowed_base: Optional[Path] = None) -> Path:
    """Return ``Path`` for ``path_str`` if it is a directory within ``allowed_base``.

    Parameters
    ----------
    path_str: str
        Path to validate.
    allowed_base: Optional[Path]
        Optional base directory. If provided, ``path_str`` must resolve inside
        this directory.
    """
    p = Path(path_str).resolve()
    if not p.is_dir():
        raise ValueError(f"{path_str} is not a directory")
    if allowed_base is not None:
        base = allowed_base.resolve()
        try:
            p.relative_to(base)
        except ValueError:
            raise ValueError(f"{p} is outside allowed directory {base}") from None
    return p


def validate_file(path_str: str, *, allowed_base: Optional[Path] = None) -> Path:
    """Return ``Path`` for ``path_str`` if it is a file within ``allowed_base``."""
    p = Path(path_str).resolve()
    if not p.is_file():
        raise ValueError(f"{path_str} is not a file")
    if allowed_base is not None:
        base = allowed_base.resolve()
        try:
            p.relative_to(base)
        except ValueError:
            raise ValueError(f"{p} is outside allowed directory {base}") from None
    return p
