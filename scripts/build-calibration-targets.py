#!/usr/bin/env python3
"""Compatibility entry point for the canonical calibration compiler.

All calibration targets are now compiled directly from the checksummed raw
historical corpus by ``python/data_ingestion/compile_calibration.py``. Keeping
this entry point avoids breaking existing automation while eliminating the
former quarterly-path and hand-authored-target implementation.
"""

from pathlib import Path
import subprocess
import sys


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    compiler = root / "python" / "data_ingestion" / "compile_calibration.py"
    command = [sys.executable, str(compiler), *sys.argv[1:]]
    completed = subprocess.run(command, cwd=root, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
