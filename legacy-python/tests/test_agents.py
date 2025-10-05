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
    Auditor,
)
from data_structures import Proposal, Project, DAO
from data_structures import ReputationTracker


class TestAgents(unittest.TestCase):
    def setUp(self):
        import random
        random.seed(0)
        dao = DAO("Sample DAO")
        self.dao = dao
        self.tracker = ReputationTracker(dao)
        self.dao_member = DAOMember(
            1,
            model=dao,
            tokens=300,
            reputation=10,
            location="US",
            # voting_strategy="simple_majority",
        )
        dao.add_member(self.dao_member)
        self.developer = Developer(
            2,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        dao.add_member(self.developer)
        self.investor = Investor(
            3,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
            voting_strategy="simple_majority",
        )
        dao.add_member(self.investor)
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
        dao.add_member(self.service_provider)
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
        self.regulator.check_project_compliance = lambda project: True
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
        self.auditor = Auditor(
            12,
            model=dao,
            tokens=100,
            reputation=10,
            location="US",
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
            topic="Topic B",
        )
        dao_instance.add_proposal(self.proposal)

        self.project = Project(
            dao=dao_instance,
            creator=creator_instance,
            title="A new project",
            description="A detailed description of the project",
            funding_goal=1000,
            duration=10,
        )
        dao_instance.add_project(self.project)

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
        self.dao_member.vote_on_proposal(self.proposal)
        self.assertIn(self.dao_member, self.proposal.votes)
        self.assertEqual(self.proposal.votes[self.dao_member]["vote"], True)
        self.assertEqual(self.proposal.votes[self.dao_member]["weight"], 1)
        self.assertEqual(self.proposal.votes_for, 1)
        self.assertEqual(self.proposal.votes_against, 0)

    def test_vote_against_proposal(self):
        self.dao_member.location = "FR"
        self.dao_member.tokens = 0
        self.dao_member.vote_on_proposal(self.proposal)
        self.assertFalse(self.proposal.votes[self.dao_member]["vote"])
        self.assertEqual(self.proposal.votes[self.dao_member]["weight"], 1)
        self.assertEqual(self.proposal.votes_for, 0)
        self.assertEqual(self.proposal.votes_against, 1)

    def test_quadratic_voting(self):
        member = DAOMember(
            12,
            model=self.dao,
            tokens=300,
            reputation=60,
            location="US",
            voting_strategy="quadratic",
        )
        member.vote_on_proposal(self.proposal)
        self.assertEqual(member.tokens, 296)
        self.assertIn(member, self.proposal.votes)
        self.assertEqual(self.proposal.votes[member]["weight"], 2)
        self.assertEqual(self.proposal.votes_for, 2)

    def test_leave_comment(self):
        self.dao_member.leave_comment(self.proposal, "positive")
        # Check if the dao_member is in the comments by iterating through the dictionaries in the proposal.comments list
        member_found = any(
            comment["member"] == self.dao_member for comment in self.proposal.comments
        )
        self.assertTrue(member_found)

    def test_invest_in_project(self):
        self.investor.invest_in_project(self.project, 50)
        self.assertIn(self.project, self.investor.investments)
        self.assertEqual(self.investor.investments[self.project], 50)

    def test_delegate_support(self):
        self.delegator.delegate_support_to_proposal(self.proposal, 50)
        self.assertIn(self.proposal, self.delegator.delegations)
        self.assertEqual(self.delegator.delegations[self.proposal], 50)

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

    def test_offer_service_emits_event(self):
        events = []
        self.dao.event_bus.subscribe(
            "service_offered", lambda **d: events.append(d)
        )
        before = self.proposal.current_funding
        self.service_provider.offer_service(self.proposal)
        self.assertIn(self.proposal, self.service_provider.services_provided)
        self.assertGreater(self.proposal.current_funding, before)
        self.assertTrue(events)

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

        if self.regulator.check_project_compliance(self.project):
            self.assertIn(compliance_issue, self.regulator.compliance_ensured)
        else:
            self.assertNotIn(compliance_issue, self.regulator.compliance_ensured)

    def test_check_project_compliance_flags_and_event(self):
        events = []
        self.dao.event_bus.subscribe(
            "compliance_checked", lambda **d: events.append(d)
        )
        self.project.funding_goal = 20000
        result = Regulator.check_project_compliance(self.regulator, self.project)
        self.assertFalse(result)
        self.assertIn(self.project, self.dao.violations)
        self.assertTrue(events)

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

    def test_developer_reputation_increases(self):
        before = self.developer.reputation
        self.developer.work_on_project()
        self.assertGreater(self.developer.reputation, before)

    def test_skill_based_project_choice(self):
        project_a = Project(
            self.dao,
            self.developer,
            "A",
            "",
            10,
            5,
            required_skills=["Python"],
        )
        project_b = Project(
            self.dao,
            self.developer,
            "B",
            "",
            10,
            5,
            required_skills=["Go"],
        )
        self.dao.add_project(project_a)
        self.dao.add_project(project_b)
        self.developer.skillset = ["Python", "SQL"]
        chosen = self.developer.choose_project_to_work_on()
        self.assertEqual(chosen, project_a)

    def test_project_choice_considers_funding(self):
        project_a = Project(
            self.dao,
            self.developer,
            "A",
            "",
            10,
            5,
            required_skills=["Python"],
        )
        project_b = Project(
            self.dao,
            self.developer,
            "B",
            "",
            10,
            5,
            required_skills=["Python"],
        )
        project_b.current_funding = 8
        self.dao.add_project(project_a)
        self.dao.add_project(project_b)
        self.developer.skillset = ["Python"]
        chosen = self.developer.choose_project_to_work_on()
        self.assertEqual(chosen, project_b)

    def test_validator_monitor_creates_dispute(self):
        events = []
        self.dao.event_bus.subscribe(
            "project_disputed", lambda **d: events.append(d)
        )
        self.project.duration = 5
        self.project.start_time = 0
        self.dao.current_step = 4
        self.validator.monitor_project(self.project)
        self.assertTrue(self.dao.disputes)
        self.assertTrue(events)

    def test_investor_budget_adjusts_with_price(self):
        self.dao.treasury.update_token_price("DAO_TOKEN", 0.8)
        before = self.investor.investment_budget
        self.investor.adjust_budget_based_on_price()
        self.assertGreater(self.investor.investment_budget, before)

    def test_auditor_flags_suspicious(self):
        suspicious = Proposal(
            dao=self.dao,
            creator=self.dao_member,
            title="S",
            description="suspicious",
            funding_goal=5000,
            duration=1,
        )
        self.dao.add_proposal(suspicious)
        self.auditor.step()
        self.assertTrue(self.dao.disputes)

    def test_tracker_updates_on_work(self):
        before = self.developer.reputation
        self.developer.work_on_project()
        self.assertGreater(self.developer.reputation, before)
        self.assertEqual(self.tracker.last_activity[self.developer.unique_id], self.dao.current_step)

    def test_tracker_updates_on_service(self):
        before = self.service_provider.reputation
        self.service_provider.offer_service(self.proposal)
        self.assertGreater(self.service_provider.reputation, before)
        self.assertEqual(self.tracker.last_activity[self.service_provider.unique_id], self.dao.current_step)

    def test_tracker_updates_on_investment(self):
        before = self.investor.reputation
        self.investor.invest_in_random_proposal()
        self.assertGreater(self.investor.reputation, before)
        self.assertEqual(self.tracker.last_activity[self.investor.unique_id], self.dao.current_step)

    def test_tracker_decay(self):
        self.developer.reputation = 10
        self.dao.current_step += 1
        self.tracker.decay_reputation()
        self.assertLess(self.developer.reputation, 10)


if __name__ == "__main__":
    unittest.main()
