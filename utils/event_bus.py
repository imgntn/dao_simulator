import threading
import queue


class EventBus:
    """Simple publish-subscribe event bus with optional async dispatch."""

    def __init__(self, async_mode: bool = False) -> None:
        self._subscribers: dict[str, list] = {}
        self._lock = threading.Lock()
        self.async_mode = async_mode
        if self.async_mode:
            self._queue: queue.Queue[tuple[str, dict]] = queue.Queue()
            self._thread = threading.Thread(target=self._worker, daemon=True)
            self._thread.start()

    def subscribe(self, event: str, callback) -> None:
        with self._lock:
            self._subscribers.setdefault(event, []).append(callback)

    def _dispatch(self, event: str, data: dict) -> None:
        with self._lock:
            subscribers = list(self._subscribers.get(event, []))
            wildcards = list(self._subscribers.get("*", []))
        for cb in subscribers:
            cb(event=event, **data)
        for cb in wildcards:
            cb(event=event, **data)

    def _worker(self):
        while True:
            item = self._queue.get()
            if item is None:
                break
            event, data = item
            self._dispatch(event, data)

    def publish(self, event: str, **data) -> None:
        if self.async_mode:
            self._queue.put((event, data))
        else:
            self._dispatch(event, data)

    def close(self) -> None:
        if self.async_mode:
            self._queue.put(None)
            self._thread.join()
