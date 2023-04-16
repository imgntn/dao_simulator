from model.dao_model import DAOModel
import matplotlib.pyplot as plt
import pandas as pd

class DAOSimulation:
    def __init__(self, n_agents, n_steps):
        self.n_agents = n_agents
        self.n_steps = n_steps

    def run_simulation(self):
        model = DAOModel(self.n_agents)

        for i in range(self.n_steps):
            model.step()

        return model.data_collector.get_model_vars_dataframe()

    def plot_simulation_results(self, data):
        fig, ax = plt.subplots(2, 2, figsize=(10, 10))

        data["Total Members"].plot(ax=ax[0, 0], title="Total Members")
        data["Total Proposals"].plot(ax=ax[0, 1], title="Total Proposals")
        data["Total Projects"].plot(ax=ax[1, 0], title="Total Projects")
        data["Total Violations"].plot(ax=ax[1, 1], title="Total Violations")

        plt.show()

if __name__ == "__main__":
    simulation = DAOSimulation(n_agents=50, n_steps=100)
    data = simulation.run_simulation()
    simulation.plot_simulation_results(data)
