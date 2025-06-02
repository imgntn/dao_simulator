import unittest
import os
import tempfile
import csv
from utils import EventLogger, DBEventLogger
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

    def test_context_manager(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        with EventLogger(fname) as logger:
            logger.log(0, "test", data=1)
        with open(fname) as f:
            rows = list(csv.DictReader(f))
        self.assertEqual(rows[0]["event"], "test")
        os.remove(fname)

    def test_log_async(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = EventLogger(fname)
        import asyncio

        asyncio.run(logger.log_async(0, "async_test", info=True))
        logger.close()
        with open(fname) as f:
            rows = list(csv.DictReader(f))
        self.assertEqual(rows[0]["event"], "async_test")
        os.remove(fname)

    def test_background_async_logging(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = EventLogger(fname, async_logging=True)
        logger.log(0, "a1")
        logger.log(1, "a2", data=2)
        logger.close()
        with open(fname) as f:
            rows = list(csv.DictReader(f))
        events = [r["event"] for r in rows]
        self.assertEqual(events, ["a1", "a2"])
        os.remove(fname)

    def test_db_logger(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = DBEventLogger(fname)
        dao = DAO("D", event_logger=logger)
        member = DAOMember("m", model=dao, tokens=50, reputation=0, location="US")
        dao.add_member(member)
        proposal = Proposal(dao, member, "t", "d", 10, 5)
        dao.add_proposal(proposal)
        dao.treasury.deposit("DAO_TOKEN", 5)
        logger.close()
        import sqlite3

        conn = sqlite3.connect(fname)
        rows = conn.execute("SELECT event FROM events").fetchall()
        conn.close()
        events = [r[0] for r in rows]
        self.assertIn("proposal_created", events)
        self.assertIn("token_deposit", events)
        os.remove(fname)

    def test_db_async_logging(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = DBEventLogger(fname, async_logging=True)
        logger.log(0, "e1")
        logger.log(1, "e2")
        logger.close()
        import sqlite3

        conn = sqlite3.connect(fname)
        rows = conn.execute("SELECT event FROM events").fetchall()
        conn.close()
        events = [r[0] for r in rows]
        self.assertEqual(events, ["e1", "e2"])
        os.remove(fname)


if __name__ == "__main__":
    unittest.main()
