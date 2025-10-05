class MarketShock:
    """Event representing an abrupt token price change."""

    def __init__(self, step: int, severity: float) -> None:
        self.step = step
        self.severity = severity  # +/- 0.x multiplier applied to the price

    def to_dict(self) -> dict:
        return {"step": self.step, "severity": self.severity}

    @classmethod
    def from_dict(cls, data: dict):
        return cls(data.get("step", 0), data.get("severity", 0.0))

