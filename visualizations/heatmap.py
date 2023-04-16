import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

def draw_heatmap(model):
    agent_count = model.schedule.get_agent_count()
    interactions = np.zeros((agent_count, agent_count))

    for agent in model.schedule.agents:
        for target_agent, count in agent.interactions.items():
            interactions[agent.unique_id, target_agent.unique_id] = count

    plt.figure(figsize=(12, 10))
    sns.heatmap(interactions, annot=True, fmt='.0f', cmap='YlGnBu')
    plt.xlabel("Agent ID")
    plt.ylabel("Agent ID")
    plt.title("Agent Interactions")
    plt.show()
