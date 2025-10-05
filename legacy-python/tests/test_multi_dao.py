import unittest
from multi_dao_simulation import MultiDAOSimulation
from .test_constants import (
    get_clean_multi_dao_simulation,
    TINY_AMOUNT,
    SMALL_AMOUNT,
    BRIDGE_FEE_RATE,
    BRIDGE_DELAY,
)


class TestMultiDAO(unittest.TestCase):
    def test_transfer_and_migration(self):
        # Use clean simulation for predictable testing
        sim = get_clean_multi_dao_simulation(num_daos=2, num_developers=1)
        dao0 = sim.daos[0].dao
        dao1 = sim.daos[1].dao
        member = dao0.members[0]
        
        # Start with clean balances (both should be 0)
        self.assertEqual(dao0.treasury.get_token_balance("DAO_TOKEN"), 0)
        self.assertEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), 0)
        
        # Add tokens to dao0 and transfer to dao1
        dao0.treasury.deposit("DAO_TOKEN", TINY_AMOUNT)
        sim.transfer_tokens(0, 1, TINY_AMOUNT)
        
        # dao1 should now have the transferred tokens
        self.assertEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), TINY_AMOUNT)
        sim.migrate_member(member.unique_id, 0, 1)
        self.assertIn(member, dao1.members)
        self.assertNotIn(member, dao0.members)

    def test_bridge_tokens(self):
        # Use clean simulation for predictable testing
        sim = get_clean_multi_dao_simulation(num_daos=2)
        sim.create_bridge(0, 1, fee_rate=BRIDGE_FEE_RATE, delay=BRIDGE_DELAY)
        dao0 = sim.daos[0].dao
        dao1 = sim.daos[1].dao
        
        # Start with clean balances
        self.assertEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), 0)
        
        # Add tokens to dao0 and initiate bridge transfer
        dao0.treasury.deposit("DAO_TOKEN", SMALL_AMOUNT)
        sim.bridge_tokens(0, 1, TINY_AMOUNT)
        
        # Before processing, DAO1 balance should still be 0
        self.assertEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), 0)
        
        sim.step()  # first step processes the transfer
        
        # After processing, DAO1 should receive TINY_AMOUNT minus bridge fee
        # TINY_AMOUNT (5) * (1 - BRIDGE_FEE_RATE) = 5 * 0.9 = 4.5
        expected_transfer = TINY_AMOUNT * (1 - BRIDGE_FEE_RATE)
        self.assertAlmostEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), expected_transfer)

    def test_bridge_nft(self):
        sim = MultiDAOSimulation(
            num_daos=2,
            enable_cross_dao=False,
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_external_partners=0,
            num_passive_members=0,
        )
        sim.create_bridge(0, 1, delay=1)
        dao0_sim = sim.daos[0]
        dao1_sim = sim.daos[1]

        from agents.dao_member import DAOMember

        creator = DAOMember(1, model=dao0_sim.dao, tokens=100, reputation=1, location="US")
        dao0_sim.dao.add_member(creator)
        nft = dao0_sim.marketplace.mint_nft(creator, {"name": "Art"}, listed=False)

        sim.bridge_nft(0, 1, nft.id)
        self.assertEqual(len(dao1_sim.marketplace.nfts), 0)
        sim.step()
        self.assertEqual(len(dao1_sim.marketplace.nfts), 1)
        self.assertEqual(dao1_sim.marketplace.nfts[0].id, nft.id)


if __name__ == "__main__":
    unittest.main()
