import unittest
import settings

class TestSettings(unittest.TestCase):
    def test_update_settings(self):
        original = settings.settings["num_developers"]
        settings.update_settings(num_developers=42)
        self.assertEqual(settings.settings["num_developers"], 42)
        # restore
        settings.update_settings(num_developers=original)

    def test_load_settings(self):
        import json, tempfile, os

        fd, fname = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        with open(fname, "w") as f:
            json.dump({"num_developers": 7}, f)

        original = settings.settings["num_developers"]
        settings.load_settings(fname)
        self.assertEqual(settings.settings["num_developers"], 7)
        settings.update_settings(num_developers=original)
        os.remove(fname)

    def test_emission_settings_exist(self):
        self.assertIn("token_emission_rate", settings.settings)
        self.assertIn("token_burn_rate", settings.settings)

if __name__ == "__main__":
    unittest.main()
