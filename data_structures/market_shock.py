class MarketShock:
    """Event representing an abrupt token price change."""

    def __init__(self, step: int, severity: float) -> None:
        self.step = step
        self.severity = severity  # +/- 0.x multiplier applied to the price

    def to_dict(self) -> dict:
        return {"step": self.step, "severity": self.severity}
