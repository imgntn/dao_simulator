import unittest
import os
import tempfile
import csv
from utils import EventLogger
from data_structures import DAO, Proposal
from agents import DAOMember


class TestEventLogger(unittest.TestCase):
    def test_events_logged(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = EventLogger(fname)
        dao = DAO("T", event_logger=logger)
        member = DAOMember("m", model=dao, tokens=100, reputation=0, location="US")
        dao.add_member(member)
        proposal = Proposal(dao, member, "title", "desc", 10, 5)
        dao.add_proposal(proposal)
        member.vote_on_proposal(proposal)
        member.leave_comment(proposal, "positive")
        dao.treasury.deposit("DAO_TOKEN", 10)
        logger.close()
        with open(fname) as f:
            rows = list(csv.DictReader(f))
        events = [r["event"] for r in rows]
        self.assertIn("proposal_created", events)
        self.assertIn("vote_cast", events)
        self.assertIn("comment_added", events)
        self.assertIn("token_deposit", events)
        os.remove(fname)


if __name__ == "__main__":
    unittest.main()
