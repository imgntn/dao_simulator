import csv
import json


class EventLogger:
    """Simple event logger writing events to a CSV file."""

    def __init__(self, filename: str, async_logging: bool = False):
        self.filename = filename
        self.async_logging = async_logging
        self.file = open(self.filename, "w", newline="")
        self.writer = csv.DictWriter(
            self.file, fieldnames=["step", "event", "details"]
        )
        self.writer.writeheader()
        if self.async_logging:
            import queue
            import threading

            self._queue = queue.Queue()
            self._thread = threading.Thread(target=self._worker, daemon=True)
            self._thread.start()

    def _write(self, step: int, event: str, details: dict):
        self.writer.writerow(
            {"step": step, "event": event, "details": json.dumps(details)}
        )
        self.file.flush()

    def _worker(self):
        while True:
            item = self._queue.get()
            if item is None:
                break
            step, event, details = item
            self._write(step, event, details)

    def log(self, step: int, event: str, **details):
        if self.async_logging:
            self._queue.put((step, event, details))
        else:
            self._write(step, event, details)

    def close(self):
        if self.async_logging:
            self._queue.put(None)
            self._thread.join()
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

    # Event bus integration
    def handle_event(self, event: str, step: int, **details):
        self.log(step, event, **details)
