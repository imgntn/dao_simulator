import unittest
from utils.locations import generate_random_location
from unittest.mock import patch
import io
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
        self.simulation.dao.disputes = [dispute_1, dispute_2]

        # Simulate 1 step
        self.simulation.step()

        # Both disputes should be resolved
        self.assertEqual(dispute_1["status"], "resolved")
        self.assertEqual(dispute_2["status"], "resolved")


def test_distribute_revenue(self):
    # Add revenue to the treasury
    self.simulation.dao.treasury.add_revenue(1000)

    # Record initial token balance of each member
    initial_balances = {
        member.unique_id: member.tokens for member in self.simulation.dao.members
    }

    # Simulate 1 step
    self.simulation.step()

    # Check if each member received the correct revenue share
    total_staked_tokens = sum(initial_balances.values())
    for member in self.simulation.dao.members:
        expected_balance = initial_balances[member.unique_id] + (
            1000 * (initial_balances[member.unique_id] / total_staked_tokens)
        )
        self.assertAlmostEqual(member.tokens, expected_balance)


def test_execute_token_buyback(self):
    # Set treasury funds to 6000 tokens
    self.simulation.dao.treasury.funds = 6000

    # Simulate 1 step
    self.simulation.step()

    # Check if the treasury funds have decreased by 10% (600 tokens)
    self.assertEqual(self.simulation.dao.treasury.funds, 5400)


def test_conduct_regular_meeting(self):
    # Replace generate_random_topic with a fixed topic
    original_generate_random_topic = self.simulation.generate_random_topic
    self.simulation.generate_random_topic = lambda: "Topic A"

    with patch("sys.stdout", new=io.StringIO()) as fake_stdout:
        for _ in range(30):
            self.simulation.step()

        output = fake_stdout.getvalue()

    # Restore the original generate_random_topic method
    self.simulation.generate_random_topic = original_generate_random_topic

    # Check if the meeting was conducted and the majority vote was printed
    self.assertIn("Majority voted", output)


def test_conduct_regular_meeting(self):
    # Replace generate_random_topic with a fixed topic
    original_generate_random_topic = self.simulation.generate_random_topic
    self.simulation.generate_random_topic = lambda: "Topic A"

    with patch("sys.stdout", new=io.StringIO()) as fake_stdout:
        for _ in range(30):
            self.simulation.step()

        output = fake_stdout.getvalue()

    # Restore the original generate_random_topic method
    self.simulation.generate_random_topic = original_generate_random_topic

    # Check if the meeting was conducted and the majority vote was printed
    self.assertIn("Majority voted", output)


if __name__ == "__main__":
    unittest.main()
