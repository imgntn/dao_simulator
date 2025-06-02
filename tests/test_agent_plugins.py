import unittest
import tempfile
import os
from utils.agent_plugins import load_agent_plugins, get_agent
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


if __name__ == "__main__":
    unittest.main()
