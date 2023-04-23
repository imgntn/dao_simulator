import unittest
from data_structures.dao import DAO
from agents import Developer, Investor, Delegator
from data_structures import Proposal


class TestIntegration(unittest.TestCase):
    def test_simulation_run(self):
        # Initialize a simple DAO with a name
        dao = DAO("Sample DAO")

        # Add agents to the DAO
        for _ in range(3):
            dao.add_member(Developer(dao))
            dao.add_member(Investor(dao))
            dao.add_member(Delegator(dao))

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
