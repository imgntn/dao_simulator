import unittest
import tempfile
import os
from utils.metric_plugins import load_metric_plugins
from dao_simulation import DAOSimulation


class TestMetricPlugins(unittest.TestCase):
    def test_metric_plugin_records_value(self):
        with tempfile.TemporaryDirectory(dir=os.getcwd()) as tmp:
            plugin = os.path.join(tmp, "extra.py")
            with open(plugin, "w") as f:
                f.write(
                    "from utils.metric_plugins import register_metric\n"
                    "def extra(model):\n    return {'extra_metric': 42}\n"
                    "register_metric('extra', extra)\n"
                )
            load_metric_plugins(tmp)
            sim = DAOSimulation(
                num_developers=0,
                num_investors=0,
                num_delegators=0,
                num_proposal_creators=0,
                num_validators=0,
                num_service_providers=0,
                num_arbitrators=0,
                num_regulators=0,
                num_external_partners=0,
                num_passive_members=0,
                comment_probability=0,
            )
            sim.step()
            row = sim.datacollector.model_vars[-1]
            self.assertIn('extra_metric', row)


if __name__ == "__main__":
    unittest.main()
