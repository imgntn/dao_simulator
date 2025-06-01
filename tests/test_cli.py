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

if __name__ == "__main__":
    unittest.main()
