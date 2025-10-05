import unittest
from dao_simulation import DAOSimulation
from data_structures import Project
from agents.dao_member import DAOMember


class TestProjectCompletion(unittest.TestCase):
    def test_rewards_distributed(self):
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
        )

        dev = DAOMember("d", model=sim.dao, tokens=0, reputation=0, location="US")
        sim.dao.add_member(dev)
        sim.schedule.add(dev)

        project = Project(sim.dao, dev, "P", "D", 100, duration=1)
        project.start_time = 0
        project.current_funding = 100
        project.receive_work(dev, 10)
        sim.dao.add_project(project)

        sim.dao.treasury.deposit("DAO_TOKEN", 100)
        sim.schedule.steps = 1
        sim.complete_projects()

        self.assertEqual(project.status, "completed")
        self.assertAlmostEqual(dev.tokens, 100)


if __name__ == "__main__":
    unittest.main()

