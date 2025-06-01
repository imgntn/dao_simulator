import unittest
from dao_simulation import DAOSimulation
from data_structures import FundingProposal, Project
from agents.dao_member import DAOMember

class TestProposalSubtypes(unittest.TestCase):
    def test_funding_proposal_adds_project(self):
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
        )
        creator = DAOMember("c", model=sim.dao, tokens=100, reputation=10, location="US")
        sim.dao.add_member(creator)
        sim.schedule.add(creator)
        project = Project(sim.dao, creator, "P", "D", 100)
        proposal = FundingProposal(sim.dao, creator, "fund", "desc", 100, 0, project)
        sim.dao.add_proposal(proposal)
        proposal.add_vote(creator, True)
        sim.step()
        sim.step()
        self.assertIn(project, sim.dao.projects)

if __name__ == "__main__":
    unittest.main()
