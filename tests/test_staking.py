import unittest
from dao_simulation import DAOSimulation

class TestStaking(unittest.TestCase):
    def test_staking_rewards(self):
        sim = DAOSimulation(
            num_developers=1,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_external_partners=0,
            num_passive_members=0,
            comment_probability=0,
        )
        member = sim.dao.members[0]
        member.stake_tokens(50, "DAO_TOKEN")
        sim.dao.treasury.add_revenue(50)
        sim.step()
        self.assertEqual(member.tokens, 100)
        self.assertEqual(member.staked_tokens, 50)

if __name__ == "__main__":
    unittest.main()
