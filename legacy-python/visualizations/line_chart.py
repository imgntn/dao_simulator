import matplotlib.pyplot as plt


def plot_price_history(prices, show=True):
    """Plot DAO token price over time."""
    fig, ax = plt.subplots()
    ax.plot(prices, marker="o")
    ax.set_xlabel("Step")
    ax.set_ylabel("DAO Token Price")
    ax.set_title("DAO Token Price History")
    if show:
        plt.show()
    return fig
