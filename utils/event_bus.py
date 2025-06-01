class EventBus:
    """Simple publish-subscribe event bus."""

    def __init__(self):
        self._subscribers = {}

    def subscribe(self, event: str, callback):
        self._subscribers.setdefault(event, []).append(callback)

    def publish(self, event: str, **data):
        for cb in self._subscribers.get(event, []):
            cb(event=event, **data)
        for cb in self._subscribers.get("*", []):
            cb(event=event, **data)
