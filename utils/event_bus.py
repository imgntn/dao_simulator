import threading


class EventBus:
    """Simple publish-subscribe event bus with optional async dispatch."""

    def __init__(self, async_mode: bool = False) -> None:
        self._subscribers: dict[str, list] = {}
        self.async_mode = async_mode

    def subscribe(self, event: str, callback) -> None:
        self._subscribers.setdefault(event, []).append(callback)

    def _dispatch(self, event: str, data: dict) -> None:
        for cb in self._subscribers.get(event, []):
            cb(event=event, **data)
        for cb in self._subscribers.get("*", []):
            cb(event=event, **data)

    def publish(self, event: str, **data) -> None:
        if self.async_mode:
            threading.Thread(
                target=self._dispatch,
                args=(event, data),
                daemon=True,
            ).start()
        else:
            self._dispatch(event, data)
