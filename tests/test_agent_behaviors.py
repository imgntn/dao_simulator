import unittest
from agents.investor import Investor
from agents.validator import Validator
from agents.service_provider import ServiceProvider
from agents.proposal_creator import ProposalCreator
from model.dao import DAO, Treasury
from model.dao_model import DAOModel
from data_structures.proposal import Proposal
from data_structures.project import Project

class TestAgentBehaviors(unittest.TestCase):

    def setUp(self):
        # Set up a basic DAO model for testing
        self.dao = DAO("TestDAO")
        self.treasury = Treasury(1000, {"ETH": 10})
        self.dao_model = DAOModel(self.dao, self.treasury)
        
    def test_investor_behavior(self):
        investor = Investor(1, self.dao_model, 100)
        proposal = Proposal("Funding", 50, 2, "Project1")
        self.dao.add_proposal(proposal)
        investor.invest()
        self.assertEqual(proposal.current_funding, 50)

    def test_validator_behavior(self):
        validator = Validator(2, self.dao_model)
        proposal = Proposal("Funding", 50, 2, "Project1")
        self.dao.add_proposal(proposal)
        validator.validate_proposal(proposal)
        self.assertTrue(proposal.validated)

    def test_service_provider_behavior(self):
        service_provider = ServiceProvider(3, self.dao_model, "Marketing")
        project = Project("Marketing", 10, "Test project")
        self.dao.add_project(project)
        service_provider.perform_service(project)
        self.assertTrue(project.service_completed)

    def test_proposal_creator_behavior(self):
        proposal_creator = ProposalCreator(4, self.dao_model)
        proposal = proposal_creator.create_proposal("Funding", 50, "Project1")
        self.dao.add_proposal(proposal)
        self.assertIn(proposal, self.dao.proposals)

if __name__ == '__main__':
    unittest.main()
