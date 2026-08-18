#!/usr/bin/env python3
"""Build a checksummed, machine-readable ledger for historical source tables."""

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = PROJECT_ROOT / "results" / "historical"
DEFAULT_POLICIES = Path(__file__).with_name("source_policies.json")
DEFAULT_OUTPUT = DEFAULT_DATA_DIR / "source-ledger.json"

DATE_CANDIDATES = (
    "timestamp_iso",
    "created_iso",
    "created_at",
    "start_date",
    "block_timestamp",
    "date",
)


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_timestamp(value):
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def inspect_csv(path, data_dir):
    row_count = 0
    columns = []
    source_counts = {}
    dao_ids = set()
    min_date = None
    max_date = None
    invalid_date_rows = 0
    date_column = None

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        columns = reader.fieldnames or []
        date_column = next(
            (candidate for candidate in DATE_CANDIDATES if candidate in columns),
            None,
        )
        for row in reader:
            row_count += 1
            source = (row.get("source") or "unspecified").strip().lower()
            source_counts[source] = source_counts.get(source, 0) + 1
            dao_id = (row.get("dao_id") or "").strip()
            if dao_id:
                dao_ids.add(dao_id)
            if date_column:
                parsed = parse_timestamp(row.get(date_column))
                if parsed is None:
                    invalid_date_rows += 1
                else:
                    min_date = parsed if min_date is None else min(min_date, parsed)
                    max_date = parsed if max_date is None else max(max_date, parsed)

    stat = path.stat()
    return {
        "path": path.relative_to(data_dir).as_posix(),
        "sha256": sha256_file(path),
        "bytes": stat.st_size,
        "filesystem_modified_at_utc": dt.datetime.fromtimestamp(
            stat.st_mtime,
            tz=dt.timezone.utc,
        ).isoformat(),
        "rows": row_count,
        "columns": columns,
        "dao_ids": sorted(dao_ids),
        "sources": dict(sorted(source_counts.items())),
        "date_column": date_column,
        "min_date": min_date.isoformat() if min_date else None,
        "max_date": max_date.isoformat() if max_date else None,
        "invalid_date_rows": invalid_date_rows,
    }


def atomic_json_dump(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def build_ledger(data_dir, policies_path):
    policies = json.loads(policies_path.read_text(encoding="utf-8"))
    try:
        data_root_label = data_dir.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        data_root_label = data_dir.as_posix()
    csv_paths = sorted(
        path
        for path in data_dir.rglob("*.csv")
        if "validation" not in path.relative_to(data_dir).parts
    )
    tables = [inspect_csv(path, data_dir) for path in csv_paths]
    observed_sources = sorted({
        source
        for table in tables
        for source in table["sources"]
        if source != "unspecified"
    })
    unresolved_sources = [
        source
        for source in observed_sources
        if source not in policies["sources"]
    ]
    return {
        "schema_version": "1.0.0",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "data_root": data_root_label,
        "policy_review": {
            "reviewed_at_utc": policies["reviewed_at_utc"],
            "review_scope": policies["review_scope"],
            "policies_sha256": sha256_file(policies_path),
        },
        "source_policies": policies["sources"],
        "observed_sources": observed_sources,
        "unresolved_sources": unresolved_sources,
        "table_count": len(tables),
        "total_rows": sum(table["rows"] for table in tables),
        "tables": tables,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--policies", type=Path, default=DEFAULT_POLICIES)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    ledger = build_ledger(args.data_dir.resolve(), args.policies.resolve())
    if ledger["unresolved_sources"]:
        raise SystemExit(
            "Missing source policies: " + ", ".join(ledger["unresolved_sources"])
        )
    atomic_json_dump(args.output.resolve(), ledger)
    print(
        f"Wrote {ledger['table_count']} tables / {ledger['total_rows']} rows "
        f"to {args.output}"
    )


if __name__ == "__main__":
    main()
