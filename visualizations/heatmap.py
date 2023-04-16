import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

def collect_interaction_data(model):
    interactions = pd.DataFrame(columns=["from", "to", "count"])

    for member in model.dao.members:
        for other_member, count in member.interactions.items():
            interactions.loc[len(interactions)] = [type(member).__name__, type(other_member).__name__, count]

    return interactions

def visualize_heatmap(model):
    interactions = collect_interaction_data(model)
    interaction_matrix = interactions.pivot_table(index="from", columns="to", values="count", aggfunc="sum").fillna(0)
    
    plt.figure(figsize=(12, 8))
    sns.heatmap(interaction_matrix, cmap="coolwarm_r", annot=True, fmt=".0f")
    plt.title("Agent Interactions")
    plt.show()

if __name__ == "__main__":
    from model.dao_model import DAOModel

    # Instantiate the DAOModel with sample agents
    model = DAOModel(n_agents=30)

    # Simulate the model for some steps
    for _ in range(50):
        model.step()

    # Visualize the heatmap
    visualize_heatmap(model)
