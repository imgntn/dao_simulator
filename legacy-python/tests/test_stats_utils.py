import unittest
import os
import tempfile
from pathlib import Path

from utils.stats import gini, in_degree_centrality
from utils.path_utils import validate_file


class Dummy:
    def __init__(self, uid, rep=None):
        self.unique_id = uid
        self.representative = rep


class TestStatsUtils(unittest.TestCase):
    def test_gini_basic(self):
        self.assertAlmostEqual(gini([1, 2, 3, 4]), 0.25)

    def test_gini_negative_ignored(self):
        self.assertEqual(gini([5, -1]), 0.0)

    def test_in_degree_centrality(self):
        a = Dummy('a')
        b = Dummy('b', rep=a)
        c = Dummy('c', rep=a)
        result = in_degree_centrality([a, b, c])
        self.assertAlmostEqual(result['a'], 1.0)
        self.assertEqual(result['b'], 0.0)
        self.assertEqual(result['c'], 0.0)

    def test_validate_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            fname = os.path.join(tmp, 'f.txt')
            with open(fname, 'w') as f:
                f.write('x')
            path = validate_file(fname, allowed_base=Path(tmp))
            self.assertEqual(path, Path(fname).resolve())
            with self.assertRaises(ValueError):
                validate_file(fname + 'missing')
            invalid_base = Path(tmp) / "subdir"
            invalid_base.mkdir()
            with self.assertRaises(ValueError):
                validate_file(fname, allowed_base=invalid_base)


if __name__ == '__main__':
    unittest.main()
