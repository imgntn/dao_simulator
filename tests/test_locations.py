import unittest
import importlib
from unittest.mock import patch

class TestLocations(unittest.TestCase):
    def test_generate_random_location_importerror(self):
        original_import = __import__

        def side_effect(name, *args, **kwargs):
            if name == "pycountry":
                raise ImportError
            return original_import(name, *args, **kwargs)

        with patch.dict('sys.modules', {'pycountry': None}):
            with patch('builtins.__import__', side_effect=side_effect):
                import utils.locations as locations
                importlib.reload(locations)
                loc = locations.generate_random_location()
        self.assertIsInstance(loc, str)

if __name__ == "__main__":
    unittest.main()

