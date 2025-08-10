import unittest
import os
import tempfile
from utils import DBEventLogger
from data_structures import DAO
from agents import DAOMember


class TestEventAnalytics(unittest.TestCase):
    def test_summary(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = DBEventLogger(fname)
        dao = DAO("D", event_logger=logger)
        member = DAOMember("m", model=dao, tokens=10, reputation=0, location="US")
        dao.add_member(member)
        dao.treasury.deposit("DAO_TOKEN", 5)
        logger.close()
        logger = None  # Ensure the first logger is fully cleaned up
        
        # Create a new logger to read the summary
        logger = DBEventLogger(fname)
        summary = logger.get_summary()
        self.assertIn("token_deposit", summary["counts"])
        logger.close()
        logger = None  # Ensure cleanup before removing file
        
        # Add a small delay on Windows to ensure file handle is released
        import platform
        if platform.system() == "Windows":
            import time
            time.sleep(0.1)
        
        os.remove(fname)

    def test_token_in_out_summary(self):
        fd, fname = tempfile.mkstemp()
        os.close(fd)
        logger = DBEventLogger(fname)
        dao = DAO("D", event_logger=logger)
        dao.treasury.deposit("DAO_TOKEN", 5)
        dao.treasury.withdraw("DAO_TOKEN", 2)
        logger.close()
        logger = None  # Ensure the first logger is fully cleaned up
        
        # Create a new logger to read the summary
        logger = DBEventLogger(fname)
        summary = logger.get_summary()
        self.assertEqual(summary["token_in"]["DAO_TOKEN"], 5)
        self.assertEqual(summary["token_out"]["DAO_TOKEN"], 2)
        logger.close()
        logger = None  # Ensure cleanup before removing file
        
        # Add a small delay on Windows to ensure file handle is released
        import platform
        if platform.system() == "Windows":
            import time
            time.sleep(0.1)
            
        os.remove(fname)


if __name__ == "__main__":
    unittest.main()

