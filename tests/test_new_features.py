import unittest
import random
from data_structures import DAO, Proposal
from agents import Delegator, Arbitrator, DAOMember
from data_structures.dispute import Dispute

class TestNewFeatures(unittest.TestCase):
    def test_delegator_step_delegates(self):
        random.seed(0)
        dao = DAO("Test", violation_probability=0.0, reputation_penalty=0)
        creator = DAOMember("c", model=dao, tokens=100, reputation=10, location="US")
        proposal = Proposal(dao, creator, "Title", "Desc", 50, 5)
        dao.add_proposal(proposal)
        delegator = Delegator("d", model=dao, tokens=100, reputation=10, location="US")
        dao.add_member(delegator)

        initial_budget = delegator.delegation_budget
        delegator.step()
        self.assertLess(delegator.delegation_budget, initial_budget)
        self.assertTrue(delegator.delegations)

    def test_arbitrator_arbitrate_uses_settings(self):
        random.seed(0)
        dao = DAO("Test", violation_probability=1.0, reputation_penalty=3)
        member = DAOMember("m", model=dao, tokens=100, reputation=10, location="US")
        dispute = Dispute(
            dao,
            [member],
            "Test dispute",
            importance=1,
            project=None,
            member=member,
        )
        dao.add_dispute(dispute)
        arbitrator = Arbitrator("a", model=dao, tokens=100, reputation=10, location="US")
        dao.add_member(arbitrator)

        arbitrator.arbitrate(dispute)
        self.assertTrue(dispute.resolved)
        self.assertEqual(member.reputation, 7)

    def test_reputation_decay(self):
        from dao_simulation import DAOSimulation

        sim = DAOSimulation(
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_auditors=0,
            num_bounty_hunters=0,
            num_external_partners=0,
            num_passive_members=0,
            reputation_decay_rate=0.1,
            comment_probability=0,
        )
        member = DAOMember("x", model=sim.dao, tokens=100, reputation=10, location="US")
        sim.dao.add_member(member)
        sim.step()
        self.assertLess(member.reputation, 10)

    def test_bounty_hunter_completes_bounty(self):
        from dao_simulation import DAOSimulation
        from data_structures import BountyProposal

        sim = DAOSimulation(
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_auditors=0,
            num_bounty_hunters=1,
            num_external_partners=0,
            num_passive_members=0,
            comment_probability=0,
        )
        creator = DAOMember("c", model=sim.dao, tokens=100, reputation=0, location="US")
        sim.dao.add_member(creator)
        bounty = BountyProposal(sim.dao, creator, "b", "d", 10, 1)
        sim.dao.add_proposal(bounty)
        bounty.status = "approved"
        sim.step()
        sim.step()
        hunter = [m for m in sim.dao.members if m.__class__.__name__ == "BountyHunter"][0]
        self.assertTrue(bounty.completed)
        self.assertEqual(hunter.tokens, 110)

if __name__ == "__main__":
    unittest.main()
