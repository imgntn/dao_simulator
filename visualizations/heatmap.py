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
    if df.empty:
        fig, ax = plt.subplots()
        ax.text(0.5, 0.5, "No members", ha="center", va="center")
        ax.set_axis_off()
        if show:
            plt.show()
        return fig

    # Normalize reputation and token balance values
    rep_range = df["reputation"].max() - df["reputation"].min()
    token_range = df["tokens"].max() - df["tokens"].min()
    df["reputation"] = (
        df["reputation"] - df["reputation"].min()
    ) / rep_range if rep_range else 0
    df["tokens"] = (
        df["tokens"] - df["tokens"].min()
    ) / token_range if token_range else 0

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
