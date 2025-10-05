import random
from agents.dao_member import DAOMember


class Artist(DAOMember):
    """Agent that mints NFTs and lists them for sale."""

    def step(self):
        meta = {"name": f"NFT_{self.model.current_step}_{self.unique_id}"}
        price = random.uniform(1, 10)
        nft = self.model.marketplace.mint_nft(self, meta, price, listed=False)
        self.model.marketplace.list_nft(nft.id, price, step=self.model.current_step)
        self.vote_on_random_proposal()
        if random.random() < self.model.comment_probability:
            self.leave_comment_on_random_proposal()

