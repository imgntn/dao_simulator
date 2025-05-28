import unittest
import settings

class TestSettings(unittest.TestCase):
    def test_update_settings(self):
        original = settings.settings["num_developers"]
        settings.update_settings(num_developers=42)
        self.assertEqual(settings.settings["num_developers"], 42)
        # restore
        settings.update_settings(num_developers=original)

if __name__ == "__main__":
    unittest.main()
