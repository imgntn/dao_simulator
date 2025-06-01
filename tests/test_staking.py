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

    def test_unstaking_with_lockup(self):
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
        member.stake_tokens(30, "DAO_TOKEN", lockup_period=1)
        member.unstake_tokens(30, "DAO_TOKEN")
        # lockup prevents withdrawal
        self.assertEqual(member.tokens, 70)
        self.assertEqual(member.staked_tokens, 30)
        sim.step()
        member.unstake_tokens(30, "DAO_TOKEN")
        self.assertEqual(member.tokens, 100)
        self.assertEqual(member.staked_tokens, 0)

    def test_staking_interest(self):
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
            staking_interest_rate=0.1,
        )
        member = sim.dao.members[0]
        member.stake_tokens(50, "DAO_TOKEN")
        sim.step()
        self.assertAlmostEqual(member.tokens, 55)
        self.assertEqual(member.staked_tokens, 50)

    def test_slashing_on_violation(self):
        from data_structures import DAO, Dispute
        from agents import DAOMember, Arbitrator

        dao = DAO("Test", violation_probability=1.0, reputation_penalty=0, slash_fraction=0.5)
        member = DAOMember("m", model=dao, tokens=100, reputation=10, location="US")
        arbitrator = Arbitrator("a", model=dao, tokens=100, reputation=10, location="US")
        dao.add_member(member)
        dao.add_member(arbitrator)
        dispute = Dispute(dao, [member], "issue", importance=1, project=None, member=member)
        dao.add_dispute(dispute)
        member.stake_tokens(20, "DAO_TOKEN")
        arbitrator.arbitrate(dispute)
        self.assertEqual(member.staked_tokens, 10)

if __name__ == "__main__":
    unittest.main()
