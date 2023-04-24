import unittest
from agents import (
    DAOMember,
    Developer,
    Investor,
    Delegator,
    ProposalCreator,
    Validator,
    ServiceProvider,
    Arbitrator,
    Regulator,
    ExternalPartner,
    PassiveMember,
)
from data_structures import Proposal, Project, DAO


class TestAgents(unittest.TestCase):
    def setUp(self):
        dao = DAO("Sample DAO")
        self.dao = dao
        self.dao_member = DAOMember(
            1,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.developer = Developer(
            2,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.investor = Investor(
            3,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.delegator = Delegator(
            4,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.proposal_creator = ProposalCreator(
            5,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.validator = Validator(
            6,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.service_provider = ServiceProvider(
            7,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
        )
        self.arbitrator = Arbitrator(
            8,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.regulator = Regulator(
            9,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.external_partner = ExternalPartner(
            10,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        self.passive_member = PassiveMember(
            11,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )

        # Assuming you have the appropriate DAO instance and creator (DAOMember) instance
        dao_instance = self.dao  # Replace with your DAO instance
        creator_instance = self.dao_member  # Replace with a DAOMember instance

        self.proposal = Proposal(
            dao=dao_instance,
            creator=creator_instance,
            title="A new proposal",
            description="A detailed description of the proposal",
            funding_goal=1000,
            duration=10,
        )

        self.project = Project(
            dao=dao_instance,
            creator=creator_instance,
            title="A new project",
            description="A detailed description of the project",
            funding_goal=1000,
            duration=10,
        )

    def test_dao_member_creation(self):
        self.assertEqual(self.dao_member.unique_id, 1)
        self.assertEqual(self.dao_member.location, "US")

    def test_developer_creation(self):
        self.assertEqual(self.developer.unique_id, 2)
        self.assertEqual(self.developer.location, "US")

    def test_investor_creation(self):
        self.assertEqual(self.investor.unique_id, 3)
        self.assertEqual(self.investor.location, "US")

    def test_vote_on_proposal(self):
        self.dao_member.vote_on_proposal(self.proposal, True)
        self.assertIn(self.dao_member, self.proposal.votes)
        self.assertEqual(self.proposal.votes[self.dao_member], True)

    def test_leave_comment(self):
        self.dao_member.leave_comment(self.proposal, "positive")
        self.assertIn(self.dao_member, self.proposal.comments)
        self.assertEqual(self.proposal.comments[self.dao_member], "positive")

    def test_invest_in_project(self):
        self.investor.invest_in_project(self.project, 500)
        self.assertIn(self.project, self.investor.investments)
        self.assertEqual(self.investor.investments[self.project], 500)

    def test_delegate_support(self):
        self.delegator.delegate_support_to_proposal(self.proposal, 200)
        self.assertIn(self.proposal, self.delegator.delegations)
        self.assertEqual(self.delegator.delegations[self.proposal], 200)

    def test_submit_proposal(self):
        self.proposal_creator.submit_proposal(self.proposal)
        self.assertIn(self.proposal, self.proposal_creator.submitted_proposals)

    def test_monitor_project(self):
        self.validator.monitor_project(self.project)
        self.assertIn(self.project, self.validator.monitored_projects)

    def test_provide_service(self):
        self.service_provider.provide_service(self.project, "marketing", 300)
        self.assertIn(self.project, self.service_provider.services_provided)
        self.assertEqual(
            self.service_provider.services_provided[self.project], ("marketing", 300)
        )

    def test_resolve_dispute(self):
        dispute = {"proposal": self.proposal, "reason": "Unfair voting"}
        self.arbitrator.resolve_dispute(dispute)
        self.assertIn(dispute, self.arbitrator.resolved_disputes)

    def test_ensure_compliance(self):
        compliance_issue = {
            "project": self.project,
            "requirement": "Environmental impact assessment",
        }
        self.regulator.ensure_compliance(compliance_issue)
        self.assertIn(compliance_issue, self.regulator.compliance_ensured)

    def test_collaborate_on_project(self):
        self.external_partner.collaborate_on_project(self.project)
        self.assertIn(self.project, self.external_partner.collaborated_projects)

    def test_passive_member_creation(self):
        self.assertEqual(self.passive_member.unique_id, 11)
        self.assertEqual(self.passive_member.location, "US")

    def test_vote_on_random_proposal(self):
        self.dao_member.vote_on_random_proposal()
        self.assertTrue(len(self.dao_member.votes) > 0)

    def test_leave_comment_on_random_proposal(self):
        self.dao_member.leave_comment_on_random_proposal()
        self.assertTrue(len(self.dao_member.comments) > 0)


if __name__ == "__main__":
    unittest.main()
