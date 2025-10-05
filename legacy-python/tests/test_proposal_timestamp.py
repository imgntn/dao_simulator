import unittest
from data_structures import DAO
from agents import ProposalCreator

class TestProposalTimestamp(unittest.TestCase):
    def test_proposal_creation_time_matches_dao_step(self):
        dao = DAO("TestDAO")
        dao.current_step = 5
        creator = ProposalCreator("c", model=dao, tokens=100, reputation=10, location="US")
        dao.add_member(creator)
        creator.create_proposal()
        self.assertEqual(dao.proposals[0].creation_time, dao.current_step)

if __name__ == "__main__":
    unittest.main()
