class Bridge:
    """Represent a token bridge between two DAOs."""

    def __init__(self, src_dao, dst_dao, fee_rate: float = 0.0, delay: int = 0) -> None:
        self.src_dao = src_dao
        self.dst_dao = dst_dao
        self.fee_rate = fee_rate
        self.delay = max(0, int(delay))
        self._pending: list[tuple[int, str, float]] = []

    def request_transfer(self, token: str, amount: float, step: int) -> None:
        withdrawn = self.src_dao.treasury.withdraw(token, amount)
        transferred = withdrawn * (1 - self.fee_rate)
        if self.fee_rate > 0 and withdrawn > 0:
            self.src_dao.treasury.add_revenue(withdrawn - transferred)
        fee = withdrawn - transferred
        arrival = step + self.delay
        self._pending.append((arrival, token, transferred))
        if self.src_dao.event_bus:
            self.src_dao.event_bus.publish(
                "bridge_transfer_requested",
                step=step,
                target=self.dst_dao.name,
                token=token,
                amount=transferred,
                fee=fee,
                arrival_step=arrival,
            )

    def process_pending_transfers(self, step: int) -> None:
        remaining: list[tuple[int, str, float]] = []
        for arrival, token, amount in self._pending:
            if step >= arrival:
                self.dst_dao.treasury.deposit(token, amount)
                if self.dst_dao.event_bus:
                    self.dst_dao.event_bus.publish(
                        "bridge_transfer_completed",
                        step=step,
                        source=self.src_dao.name,
                        token=token,
                        amount=amount,
                    )
            else:
                remaining.append((arrival, token, amount))
        self._pending = remaining

