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

