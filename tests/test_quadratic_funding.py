import unittest
from dao_simulation import DAOSimulation
from data_structures import Project, QuadraticFundingProposal
from agents.dao_member import DAOMember

class TestQuadraticFunding(unittest.TestCase):
    def test_matching_and_events(self):
        sim = DAOSimulation(
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
            comment_probability=0,
        )
        creator = DAOMember("c", model=sim.dao, tokens=100, reputation=60, location="US")
        member = DAOMember("m", model=sim.dao, tokens=100, reputation=60, location="US")
        sim.dao.add_member(creator)
        sim.schedule.add(creator)
        sim.dao.add_member(member)
        sim.schedule.add(member)
        project = Project(sim.dao, creator, "P", "D", 100, duration=5)
        prop = QuadraticFundingProposal(sim.dao, creator, "Q", "desc", 100, 1, project)
        prop.topic = "Topic A"
        sim.dao.add_proposal(prop)
        creator.vote_on_proposal(prop)
        member.vote_on_proposal(prop)
        prop.contribute(member, 9)
        prop.contribute(creator, 4)
        sim.dao.treasury.deposit("DAO_TOKEN", 20)
        sim.step()
        sim.step()
        sim.step()
        self.assertIn(project, sim.dao.projects)
        self.assertEqual(project.current_funding, 25)
        self.assertIn("grant_contributed", sim.datacollector.event_counts)
        self.assertIn("grant_matched", sim.datacollector.event_counts)
        self.assertIn("grant_distributed", sim.datacollector.event_counts)

if __name__ == "__main__":
    unittest.main()
