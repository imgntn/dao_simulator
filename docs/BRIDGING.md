# Cross-DAO Token Bridging

The bridging system lets one DAO send tokens to another with a configurable
transfer fee and delay. Transfers are requested via a `Bridge` object that queues
them for delivery.

Example usage:

```python
sim = MultiDAOSimulation(num_daos=2)
sim.create_bridge(0, 1, fee_rate=0.01, delay=2)

sim.daos[0].dao.treasury.deposit("DAO_TOKEN", 100)
sim.bridge_tokens(0, 1, 50)

# run steps so the transfer can arrive
sim.run(3)
```

Events `bridge_transfer_requested` and `bridge_transfer_completed` are published
to each DAO's event bus when bridging occurs.

## NFT Bridging

Bridges can also transfer NFTs between DAOs. NFTs are removed from the source
marketplace and delivered to the destination after the bridge delay.

```python
# assume `creator` minted an NFT in DAO 0
nft = sim.daos[0].marketplace.mint_nft(creator, {"name": "Art"}, listed=False)
sim.bridge_nft(0, 1, nft.id)
sim.run(2)
```

During NFT transfers the events `nft_bridge_requested` and `nft_bridge_completed`
are emitted.

A sequence diagram of the bridging process is available in [docs/DIAGRAMS.md](DIAGRAMS.md).
