import unittest
from data_structures.treasury import Treasury
from utils.event_bus import EventBus

class TestLiquidityPool(unittest.TestCase):
    def test_constant_product(self):
        bus = EventBus()
        events = []
        bus.subscribe('token_swap', lambda **d: events.append(d))
        t = Treasury(event_bus=bus)
        t.deposit('A', 1000)
        t.deposit('B', 1000)
        t.create_pool('A', 'B')
        t.add_liquidity('A', 'B', 500, 500)
        pool = t.pools[('A','B')]
        k = pool.reserve_a * pool.reserve_b
        out = t.swap('A', 'B', 100)
        self.assertGreater(out, 0)
        self.assertAlmostEqual(pool.reserve_a * pool.reserve_b, k, places=6)
        self.assertTrue(events)

if __name__ == '__main__':
    unittest.main()
