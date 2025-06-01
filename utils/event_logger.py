import csv
import json


class EventLogger:
    """Simple event logger writing events to a CSV file."""

    def __init__(self, filename: str):
        self.filename = filename
        self.file = open(self.filename, "w", newline="")
        self.writer = csv.DictWriter(
            self.file, fieldnames=["step", "event", "details"]
        )
        self.writer.writeheader()

    def log(self, step: int, event: str, **details):
        self.writer.writerow(
            {"step": step, "event": event, "details": json.dumps(details)}
        )
        self.file.flush()

    def close(self):
        if not self.file.closed:
            self.file.close()

    # Context manager support
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    async def log_async(self, step: int, event: str, **details):
        import asyncio

        await asyncio.to_thread(self.log, step, event, **details)
