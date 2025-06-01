import unittest
from unittest import mock
import settings
import cli

class TestCLI(unittest.TestCase):
    def test_cli_updates_settings(self):
        original = settings.settings["num_developers"]
        cli.main(["--steps", "1", "--num_developers", "2"])
        self.assertEqual(settings.settings["num_developers"], 2)
        settings.update_settings(num_developers=original)

    def test_cli_loads_config(self):
        import json, tempfile, os

        fd, fname = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        with open(fname, "w") as f:
            json.dump({"num_developers": 3}, f)

        original = settings.settings["num_developers"]
        cli.main(["--steps", "1", "--config", fname])
        self.assertEqual(settings.settings["num_developers"], 3)
        settings.update_settings(num_developers=original)
        os.remove(fname)

if __name__ == "__main__":
    unittest.main()
