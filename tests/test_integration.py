import unittest
from data_structures.dao import DAO
from agents import Developer, Investor, Delegator
from data_structures import Proposal
from utils.locations import generate_random_location


class TestIntegration(unittest.TestCase):
    def test_simulation_run(self):
        # Initialize a simple DAO with a name
        dao = DAO("Sample DAO")

        # Add agents to the DAO
        for _ in range(3):
            developer = Developer(
                unique_id=1,
                model=dao,
                tokens=100,
                reputation=10,
                location=generate_random_location(),
                skillset=["Python"],
                voting_strategy="Default Voting Strategy",
            )
            investor = Investor(
                unique_id=2,
                model=dao,
                tokens=1000,
                reputation=20,
                location=generate_random_location(),
                voting_strategy="Default Voting Strategy",
            )
            delegator = Delegator(
                unique_id=3,
                model=dao,
                tokens=500,
                reputation=15,
                location=generate_random_location(),
                voting_strategy="Default Voting Strategy",
            )
            dao.add_member(developer)
            dao.add_member(investor)
            dao.add_member(delegator)

        # Assert the initialization has occurred correctly
        self.assertEqual(len(dao.members), 9)

        # Run the simulation for 10 steps
        for _ in range(10):
            for agent in dao.members:
                agent.step()

        # Check if proposals have been created
        self.assertGreater(len(dao.proposals), 0)

        # Check if agents have voted on proposals
        proposal = dao.proposals[0]
        self.assertGreater(len(proposal.votes), 0)

        # Check if agents' tokens have been updated
        developer = next(
            filter(lambda agent: isinstance(agent, Developer), dao.members)
        )
        self.assertNotEqual(developer.tokens, 0)

        # Check if agents' reputations have been updated
        investor = next(filter(lambda agent: isinstance(agent, Investor), dao.members))
        self.assertNotEqual(investor.reputation, 0)

        # Check if delegators have delegated tokens
        delegator = next(
            filter(lambda agent: isinstance(agent, Delegator), dao.members)
        )
        self.assertNotEqual(delegator.delegated_tokens, 0)

        # Check if treasury balances have been updated
        self.assertNotEqual(dao.treasury.token_balance, 0)
        self.assertNotEqual(dao.treasury.reputation_balance, 0)


if __name__ == "__main__":
    unittest.main()
