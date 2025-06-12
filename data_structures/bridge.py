class Bridge:
    """Represent a bridge for tokens and NFTs between two DAOs."""

    def __init__(
        self,
        src_dao,
        dst_dao,
        fee_rate: float = 0.0,
        delay: int = 0,
        src_marketplace=None,
        dst_marketplace=None,
    ) -> None:
        self.src_dao = src_dao
        self.dst_dao = dst_dao
        self.src_marketplace = src_marketplace
        self.dst_marketplace = dst_marketplace
        self.fee_rate = fee_rate
        self.delay = max(0, int(delay))
        self._pending: list[tuple[int, str, float]] = []
        self._pending_nfts: list[tuple[int, object]] = []

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

    def request_nft_transfer(self, nft_id: int, step: int) -> None:
        if not self.src_marketplace or not self.dst_marketplace:
            return
        nft = None
        for i, obj in enumerate(self.src_marketplace.nfts):
            if obj.id == nft_id:
                nft = self.src_marketplace.nfts.pop(i)
                break
        if nft is None:
            return
        arrival = step + self.delay
        self._pending_nfts.append((arrival, nft))
        if self.src_dao.event_bus:
            self.src_dao.event_bus.publish(
                "nft_bridge_requested",
                step=step,
                target=self.dst_dao.name,
                nft_id=nft.id,
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

        remaining_nfts: list[tuple[int, object]] = []
        for arrival, nft in self._pending_nfts:
            if step >= arrival:
                if self.dst_marketplace:
                    self.dst_marketplace.nfts.append(nft)
                if self.dst_dao.event_bus:
                    self.dst_dao.event_bus.publish(
                        "nft_bridge_completed",
                        step=step,
                        source=self.src_dao.name,
                        nft_id=nft.id,
                    )
            else:
                remaining_nfts.append((arrival, nft))
        self._pending_nfts = remaining_nfts

