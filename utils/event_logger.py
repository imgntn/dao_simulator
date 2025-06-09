import csv
import json
import sqlite3
import gzip
import lzma


class EventLogger:
    """Simple event logger writing events to a CSV file."""

    def __init__(self, filename: str, async_logging: bool = False, compress: str | None = None):
        self.filename = filename
        self.async_logging = async_logging
        self.compress = compress
        if compress == "gzip":
            self.file = gzip.open(self.filename, "wt", newline="")
        elif compress == "lzma":
            self.file = lzma.open(self.filename, "wt", newline="")
        else:
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

class DBEventLogger(EventLogger):
    """SQLite-backed event logger."""

    def __init__(self, filename: str, async_logging: bool = False, compress: str | None = None):
        self.filename = filename
        self.async_logging = async_logging
        self.compress = compress
        self.conn = sqlite3.connect(self.filename, check_same_thread=False)
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS events (step INTEGER, event TEXT, details BLOB)"
        )
        self.conn.commit()
        if self.async_logging:
            import queue
            import threading

            self._queue = queue.Queue()
            self._thread = threading.Thread(target=self._worker, daemon=True)
            self._thread.start()

    def _write(self, step: int, event: str, details: dict):
        data = json.dumps(details).encode()
        if self.compress == "gzip":
            data = gzip.compress(data)
        elif self.compress == "lzma":
            data = lzma.compress(data)
        self.conn.execute(
            "INSERT INTO events (step, event, details) VALUES (?, ?, ?)",
            (step, event, data),
        )
        self.conn.commit()

    def close(self):
        if self.async_logging:
            self._queue.put(None)
            self._thread.join()
        if self.conn:
            self.conn.close()
            self.conn = None

    def get_summary(self) -> dict:
        """Return basic analytics for the logged events."""
        cur = self.conn.cursor()
        counts = {
            row[0]: row[1]
            for row in cur.execute("SELECT event, COUNT(*) FROM events GROUP BY event")
        }
        token_in = {
            row[0]: row[1]
            for row in cur.execute(
                "SELECT json_extract(details,'$.token'), SUM(json_extract(details,'$.amount'))"
                " FROM events WHERE event='token_deposit' GROUP BY json_extract(details,'$.token')"
            )
        }
        token_out = {
            row[0]: row[1]
            for row in cur.execute(
                "SELECT json_extract(details,'$.token'), SUM(json_extract(details,'$.amount'))"
                " FROM events WHERE event='token_withdraw' GROUP BY json_extract(details,'$.token')"
            )
        }
        return {"counts": counts, "token_in": token_in, "token_out": token_out}
