from .dao_model import DAOModel

class DAOSimulation:
    def __init__(self, num_agents, num_steps):
        self.num_agents = num_agents
        self.num_steps = num_steps

    def run(self):
        model = DAOModel(self.num_agents)

        for i in range(self.num_steps):
            model.step()

        return model.datacollector.get_model_vars_dataframe()
