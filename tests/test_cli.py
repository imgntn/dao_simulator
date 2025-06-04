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

    def test_cli_liquid_delegators_flag(self):
        original = settings.settings.get("num_liquid_delegators", 0)
        cli.main(["--steps", "1", "--num_liquid_delegators", "1"])
        self.assertEqual(settings.settings["num_liquid_delegators"], 1)
        settings.update_settings(num_liquid_delegators=original)

    @mock.patch("cli.DAOSimulation")
    def test_cli_passes_seed(self, MockSim):
        cli.main(["--steps", "1", "--seed", "42"])
        MockSim.assert_called_with(
            use_parallel=False,
            use_async=False,
            max_workers=None,
            report_file=None,
            export_csv=False,
            csv_filename="simulation_data.csv",
            event_db_filename=None,
            stats_db_filename=None,
            compress_events=None,
            checkpoint_interval=None,
            checkpoint_path=None,
            market_shock_file=None,
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

    @mock.patch("dao_simulation.generate_report")
    def test_cli_export_options(self, mock_report):
        import tempfile, os

        fd, csvf = tempfile.mkstemp(suffix=".csv", dir=os.getcwd())
        os.close(fd)
        os.remove(csvf)
        fd, htmlf = tempfile.mkstemp(suffix=".html", dir=os.getcwd())
        os.close(fd)
        os.remove(htmlf)

        def fake_report(*args, **kwargs):
            if kwargs.get("html_file"):
                with open(kwargs["html_file"], "w") as f:
                    f.write("hi")
        mock_report.side_effect = fake_report

        cli.main([
            "--steps",
            "1",
            "--num_developers",
            "1",
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
            csvf,
            "--export-html",
            htmlf,
        ])
        self.assertTrue(os.path.exists(csvf))
        self.assertTrue(os.path.exists(htmlf))
        mock_report.assert_called()
        os.remove(csvf)
        os.remove(htmlf)

    def test_cli_loads_oracle_plugin(self):
        import tempfile, os

        with tempfile.TemporaryDirectory(dir=os.getcwd()) as tmp:
            plugin = os.path.join(tmp, "fixed.py")
            with open(plugin, "w") as f:
                f.write(
                    "class Fixed:\n    def update_prices(self, treasury,*a,**k):\n        treasury.update_token_price('DAO_TOKEN', 9.0)\n"
                )
            cli.main(["--steps", "0", "--oracle-plugin-path", tmp])
            from utils.oracles import get_oracle

            self.assertIsNotNone(get_oracle("fixed"))

    def test_cli_matrix_option(self):
        import json, tempfile, os

        fd, fname = tempfile.mkstemp(suffix=".json", dir=os.getcwd())
        os.close(fd)
        with open(fname, "w") as f:
            json.dump([{"num_developers": 1}, {"num_developers": 2}], f)

        cli.main(["--steps", "0", "--matrix", fname])
        os.remove(fname)

    def test_cli_matrix_workers_parallel(self):
        import json, tempfile, os

        fd, fname = tempfile.mkstemp(suffix=".json", dir=os.getcwd())
        os.close(fd)
        with open(fname, "w") as f:
            json.dump([{"num_developers": 1}, {"num_developers": 1}], f)

        fd, csvf = tempfile.mkstemp(suffix=".csv", dir=os.getcwd())
        os.close(fd)
        os.remove(csvf)

        cli.main(["--steps", "0", "--matrix", fname, "--matrix-workers", "2", "--export-csv", csvf])
        self.assertTrue(os.path.exists(csvf))
        os.remove(fname)
        os.remove(csvf)


if __name__ == "__main__":
    unittest.main()
