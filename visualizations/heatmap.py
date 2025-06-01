import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd


def plot_heat_map(dao, show=True):
    # Create a DataFrame with member IDs and their respective reputation and token balances
    data = []
    for member in dao.members:
        data.append(
            {
                "id": member.unique_id,
                "reputation": member.reputation,
                "tokens": member.tokens,
            }
        )

    df = pd.DataFrame(data)

    # Normalize reputation and token balance values
    df["reputation"] = (df["reputation"] - df["reputation"].min()) / (
        df["reputation"].max() - df["reputation"].min()
    )
    df["tokens"] = (df["tokens"] - df["tokens"].min()) / (
        df["tokens"].max() - df["tokens"].min()
    )

    # Calculate a weighted score based on reputation and token balances
    df["score"] = 0.5 * df["reputation"] + 0.5 * df["tokens"]

    # Create a pivot table with a 10x10 grid
    df["row"] = pd.cut(df["reputation"], bins=10, labels=False)
    df["col"] = pd.cut(df["tokens"], bins=10, labels=False)
    pivot_table = df.pivot_table(
        values="score", index="row", columns="col", aggfunc="mean", fill_value=0
    )

    # Plot the heatmap
    fig, ax = plt.subplots()
    sns.heatmap(
        pivot_table, cmap="coolwarm", square=True, linewidths=0.5, annot=True, fmt=".2f", ax=ax
    )
    ax.set_xlabel("Token Balance")
    ax.set_ylabel("Reputation")
    ax.set_title("Heatmap: Member Score based on Reputation and Token Balance")
    if show:
        plt.show()
    return fig
