import unittest
from multi_dao_simulation import MultiDAOSimulation


class TestMultiDAO(unittest.TestCase):
    def test_transfer_and_migration(self):
        sim = MultiDAOSimulation(num_daos=2, enable_cross_dao=False,
                                 num_developers=1,
                                 num_investors=0,
                                 num_delegators=0,
                                 num_proposal_creators=0,
                                 num_validators=0,
                                 num_service_providers=0,
                                 num_arbitrators=0,
                                 num_regulators=0,
                                 num_external_partners=0,
                                 num_passive_members=0)
        dao0 = sim.daos[0].dao
        dao1 = sim.daos[1].dao
        member = dao0.members[0]
        dao0.treasury.deposit("DAO_TOKEN", 5)
        sim.transfer_tokens(0, 1, 5)
        self.assertEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), 5)
        sim.migrate_member(member.unique_id, 0, 1)
        self.assertIn(member, dao1.members)
        self.assertNotIn(member, dao0.members)

    def test_bridge_tokens(self):
        sim = MultiDAOSimulation(num_daos=2, enable_cross_dao=False,
                                 num_developers=0,
                                 num_investors=0,
                                 num_delegators=0,
                                 num_proposal_creators=0,
                                 num_validators=0,
                                 num_service_providers=0,
                                 num_arbitrators=0,
                                 num_regulators=0,
                                 num_external_partners=0,
                                 num_passive_members=0)
        sim.create_bridge(0, 1, fee_rate=0.1, delay=1)
        dao0 = sim.daos[0].dao
        dao1 = sim.daos[1].dao
        dao0.treasury.deposit("DAO_TOKEN", 10)
        sim.bridge_tokens(0, 1, 5)
        self.assertEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), 0)
        sim.step()  # first step processes the transfer
        self.assertAlmostEqual(dao1.treasury.get_token_balance("DAO_TOKEN"), 4.5)

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
