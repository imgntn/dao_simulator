from mesa import Model
from mesa.time import RandomActivation
from mesa.datacollection import DataCollector

class DAOModel(Model):
    def __init__(self, n_agents):
        self.num_agents = n_agents
        self.schedule = RandomActivation(self)
        self.dao = DAO("ExampleDAO")
        self.external_partner_interact_probability = 0.1
        self.passive_member_observe_probability = 0.2
        self.data_collector = DataCollector(
            {
                "Total Members": lambda m: len(m.dao.members),
                "Total Proposals": lambda m: len(m.dao.proposals),
                "Total Projects": lambda m: len(m.dao.projects),
                "Total Violations": lambda m: len(m.dao.violations),
            }
        )

        # Create and add agents to the model
        for i in range(self.num_agents):
            agent_class = random.choice(agent_classes)
            agent = agent_class(i, self)
            self.dao.add_member(agent)
            self.schedule.add(agent)

    def step(self):
        self.data_collector.collect(self)
        self.schedule.step()
