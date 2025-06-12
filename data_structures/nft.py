class NFT:
    """Simple non-fungible token."""

    def __init__(self, nft_id, creator, owner, metadata, price=0.0, listed=False):
        self.id = nft_id
        self.creator = creator
        self.owner = owner
        self.metadata = metadata
        self.price = price
        self.listed = listed


class NFTMarketplace:
    """Minimal marketplace to trade :class:`NFT` objects."""

    def __init__(self, event_bus=None):
        self.event_bus = event_bus
        self.nfts = []
        self._next_id = 0

    def mint_nft(self, creator, metadata, price=0.0, listed=True):
        nft = NFT(self._next_id, creator, creator, metadata, price, listed)
        self.nfts.append(nft)
        self._next_id += 1
        step = getattr(creator.model, "current_step", 0)
        if self.event_bus:
            self.event_bus.publish(
                "nft_minted",
                step=step,
                nft_id=nft.id,
                creator=creator.unique_id,
                price=price,
            )
        if listed:
            self.list_nft(nft.id, price, step=step)
        return nft

    def list_nft(self, nft_id, price=None, *, step=0):
        nft = self._get_nft(nft_id)
        if nft is None:
            return False
        if price is not None:
            nft.price = price
        nft.listed = True
        if self.event_bus:
            self.event_bus.publish(
                "nft_listed",
                step=step,
                nft_id=nft.id,
                price=nft.price,
                owner=getattr(nft.owner, "unique_id", None),
            )
        return True

    def buy_nft(self, buyer, nft_id):
        nft = self._get_nft(nft_id)
        if nft is None or not nft.listed or buyer.tokens < nft.price:
            return False
        seller = nft.owner
        buyer.tokens -= nft.price
        seller.tokens += nft.price
        nft.owner = buyer
        nft.listed = False
        step = getattr(buyer.model, "current_step", 0)
        if self.event_bus:
            self.event_bus.publish(
                "nft_sold",
                step=step,
                nft_id=nft.id,
                seller=getattr(seller, "unique_id", None),
                buyer=buyer.unique_id,
                price=nft.price,
            )
        return True

    def transfer_nft(self, nft_id, new_owner):
        nft = self._get_nft(nft_id)
        if nft is None:
            return False
        old_owner = nft.owner
        nft.owner = new_owner
        nft.listed = False
        step = getattr(new_owner.model, "current_step", 0)
        if self.event_bus:
            self.event_bus.publish(
                "nft_transferred",
                step=step,
                nft_id=nft.id,
                old_owner=getattr(old_owner, "unique_id", None),
                new_owner=new_owner.unique_id,
            )
        return True

    def get_listed_nfts(self):
        return [n for n in self.nfts if n.listed]

    def _get_nft(self, nft_id):
        for nft in self.nfts:
            if nft.id == nft_id:
                return nft
        return None

