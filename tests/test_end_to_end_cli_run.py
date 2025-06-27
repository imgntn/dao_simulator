import unittest
import subprocess
import sys
import tempfile
import os


class TestCLIEndToEnd(unittest.TestCase):
    def test_cli_generates_csv(self):
        fd, fname = tempfile.mkstemp(suffix=".csv")
        os.close(fd)
        os.remove(fname)
        subprocess.check_call([
            sys.executable,
            "cli.py",
            "--steps",
            "2",
            "--num_developers",
            "0",
            "--num_investors",
            "0",
            "--num_delegators",
            "0",
            "--num_proposal_creators",
            "0",
            "--num_validators",
            "0",
            "--num_service_providers",
            "0",
            "--num_arbitrators",
            "0",
            "--num_regulators",
            "0",
            "--num_external_partners",
            "0",
            "--num_passive_members",
            "0",
            "--export-csv",
            fname,
        ])
        self.assertTrue(os.path.exists(fname))
        os.remove(fname)


if __name__ == "__main__":
    unittest.main()
