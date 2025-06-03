import argparse
import csv
import json
import sqlite3
import gzip
import lzma
from collections import defaultdict
from pathlib import Path


def replay_log(path: str):
    """Replay events from ``path`` and return simple state counters."""
    p = Path(path)
    events = []
    if p.suffix in {".sqlite", ".db"}:
        conn = sqlite3.connect(p)
        rows = conn.execute("SELECT event, details FROM events ORDER BY step").fetchall()
        conn.close()
        for event, details in rows:
            if isinstance(details, bytes):
                for dec in (gzip.decompress, lzma.decompress):
                    try:
                        details = dec(details).decode()
                        break
                    except Exception:
                        pass
            events.append((event, json.loads(details)))
    else:
        opener = open
        if p.suffix in {".gz", ".gzip"}:
            opener = gzip.open
        elif p.suffix in {".xz", ".lzma"}:
            opener = lzma.open
        with opener(p, "rt") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = row["details"]
                try:
                    data = json.loads(text)
                except Exception:
                    b = text.encode()
                    for dec in (gzip.decompress, lzma.decompress):
                        try:
                            data = json.loads(dec(b).decode())
                            break
                        except Exception:
                            pass
                events.append((row["event"], data))

    proposals = 0
    treasury = defaultdict(float)
    for event, details in events:
        if event == "proposal_created":
            proposals += 1
        elif event == "token_deposit":
            treasury[details["token"]] += details["amount"]
        elif event == "token_withdraw":
            treasury[details["token"]] -= details["amount"]
    return {"proposals": proposals, "treasury": dict(treasury)}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Replay simulation log")
    parser.add_argument("--log", required=True, help="Path to event log")
    args = parser.parse_args(argv)
    result = replay_log(args.log)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

