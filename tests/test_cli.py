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

    @mock.patch("cli.DAOSimulation")
    def test_cli_passes_seed(self, MockSim):
        cli.main(["--steps", "1", "--seed", "42"])
        MockSim.assert_called_with(
            use_parallel=False,
            use_async=False,
            max_workers=None,
            report_file=None,
            event_db_filename=None,
            seed=42,
        )

    def test_cli_loads_config(self):
        import json, tempfile, os

        fd, fname = tempfile.mkstemp(suffix=".json", dir=os.getcwd())
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
