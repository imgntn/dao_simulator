import unittest
from dao_simulation import DAOSimulation
from data_structures.dao import DAO
from agents import (
    Arbitrator,
    Delegator,
    Developer,
    ExternalPartner,
    Investor,
    PassiveMember,
    ProposalCreator,
    Regulator,
    ServiceProvider,
    Validator,
)
import settings


def test_dao_initialization(self):
    dao = self.simulation.dao

    self.assertIsInstance(dao, DAO)
    self.assertEqual(len(dao.members), sum(settings.values()))

    developers = [agent for agent in dao.members if isinstance(agent, Developer)]
    self.assertEqual(len(developers), settings["num_developers"])

    investors = [agent for agent in dao.members if isinstance(agent, Investor)]
    self.assertEqual(len(investors), settings["num_investors"])

    delegators = [agent for agent in dao.members if isinstance(agent, Delegator)]
    self.assertEqual(len(delegators), settings["num_delegators"])

    proposal_creators = [
        agent for agent in dao.members if isinstance(agent, ProposalCreator)
    ]
    self.assertEqual(len(proposal_creators), settings["num_proposal_creators"])

    validators = [agent for agent in dao.members if isinstance(agent, Validator)]
    self.assertEqual(len(validators), settings["num_validators"])

    service_providers = [
        agent for agent in dao.members if isinstance(agent, ServiceProvider)
    ]
    self.assertEqual(len(service_providers), settings["num_service_providers"])

    arbitrators = [agent for agent in dao.members if isinstance(agent, Arbitrator)]
    self.assertEqual(len(arbitrators), settings["num_arbitrators"])

    regulators = [agent for agent in dao.members if isinstance(agent, Regulator)]
    self.assertEqual(len(regulators), settings["num_regulators"])

    external_partners = [
        agent for agent in dao.members if isinstance(agent, ExternalPartner)
    ]
    self.assertEqual(len(external_partners), settings["num_external_partners"])

    passive_members = [
        agent for agent in dao.members if isinstance(agent, PassiveMember)
    ]
    self.assertEqual(len(passive_members), settings["num_passive_members"])


def test_expire_proposals(self):
    # Add test proposals
    proposal_1 = {
        "id": "P1",
        "status": "active",
        "creation_time": 0,
        "voting_period": 5,
        "votes_for": 10,
        "votes_against": 5,
    }
    proposal_2 = {
        "id": "P2",
        "status": "active",
        "creation_time": 0,
        "voting_period": 7,
        "votes_for": 3,
        "votes_against": 10,
    }
    self.simulation.dao.proposals = [proposal_1, proposal_2]

    # Simulate 5 steps
    for _ in range(5):
        self.simulation.step()

    # Proposal 1 should be approved, and Proposal 2 should still be active
    self.assertEqual(proposal_1["status"], "approved")
    self.assertEqual(proposal_2["status"], "active")

    # Simulate 2 more steps
    for _ in range(2):
        self.simulation.step()

    # Proposal 1 should still be approved, and Proposal 2 should be rejected
    self.assertEqual(proposal_1["status"], "approved")
    self.assertEqual(proposal_2["status"], "rejected")

    def test_complete_projects(self):
        # Add test projects
        project_1 = {
            "id": "PR1",
            "status": "ongoing",
            "start_time": 0,
            "duration": 5,
        }
        project_2 = {
            "id": "PR2",
            "status": "ongoing",
            "start_time": 0,
            "duration": 7,
        }
        self.simulation.dao.projects = [project_1, project_2]

        # Simulate 5 steps
        for _ in range(5):
            self.simulation.step()

        # Project 1 should be completed, and Project 2 should still be ongoing
        self.assertEqual(project_1["status"], "completed")
        self.assertEqual(project_2["status"], "ongoing")

        # Simulate 2 more steps
        for _ in range(2):
            self.simulation.step()

        # Project 1 should still be completed, and Project 2 should be completed
        self.assertEqual(project_1["status"], "completed")
        self.assertEqual(project_2["status"], "completed")


def test_resolve_disputes(self):
    # Create a test arbitrator
    arbitrator = Arbitrator(
        unique_id="Arbitrator_1",
        model=self.simulation,
        tokens=100,
        reputation=0,
        location=generate_random_location(),
        arbitration_capacity=3,
    )

    # Add test disputes
    dispute_1 = {
        "id": "D1",
        "status": "unresolved",
        "arbitrator": arbitrator,
    }
    dispute_2 = {
        "id": "D2",
        "status": "unresolved",
        "arbitrator": arbitrator,
    }
    self.sim
