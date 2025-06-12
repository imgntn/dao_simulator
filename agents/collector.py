import random
from agents.dao_member import DAOMember


class Collector(DAOMember):
    """Agent that buys NFTs when affordable."""

    def step(self):
        listings = self.model.marketplace.get_listed_nfts()
        affordable = [n for n in listings if n.price <= self.tokens]
        if affordable:
            nft = random.choice(affordable)
            bought = self.model.marketplace.buy_nft(self, nft.id)
            if bought:
                self.mark_active()
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

