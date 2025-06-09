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


if __name__ == "__main__":
    unittest.main()
