import unittest
import tempfile
import os
from utils.agent_plugins import load_agent_plugins, get_agent, watch_agent_plugins, Observer
from data_structures import DAO
from agents.dao_member import DAOMember


class TestAgentPlugins(unittest.TestCase):
    def test_load_plugins_registers_agent(self):
        with tempfile.TemporaryDirectory() as tmp:
            plugin = os.path.join(tmp, "custom.py")
            with open(plugin, "w") as f:
                f.write(
                    "from agents.dao_member import DAOMember\n"
                    "class CustomAgent(DAOMember):\n    pass\n"
                )
            load_agent_plugins(tmp)
            cls = get_agent("customagent")
            self.assertIsNotNone(cls)
            dao = DAO("D")
            agent = cls("a", model=dao, tokens=0, reputation=0, location="US")
            dao.add_member(agent)
            self.assertIn(agent, dao.members)
            data = agent.to_dict()
            recreated = DAOMember.from_dict(data, dao)
            self.assertIsInstance(recreated, cls)

    def test_agent_hot_reload(self):
        if 'watchdog' not in Observer.__module__:
            self.skipTest('watchdog not installed')
        with tempfile.TemporaryDirectory() as tmp:
            plugin = os.path.join(tmp, "custom.py")
            with open(plugin, "w") as f:
                f.write("from agents.dao_member import DAOMember\nclass Hot(DAOMember):\n    pass\n")
            load_agent_plugins(tmp)
            obs = watch_agent_plugins(tmp)
            cls = get_agent("hot")
            dao = DAO("D")
            agent = cls("a", model=dao, tokens=0, reputation=0, location="US")
            dao.add_member(agent)
            self.assertIsInstance(agent, cls)
            with open(plugin, "w") as f:
                f.write("from agents.dao_member import DAOMember\nclass Hot(DAOMember):\n    def new(self):\n        return 'updated'\n")
            import time
            time.sleep(1)
            cls2 = get_agent("hot")
            self.assertTrue(hasattr(cls2("b", model=dao, tokens=0, reputation=0, location='US'), "new"))
            obs.stop()


if __name__ == "__main__":
    unittest.main()
