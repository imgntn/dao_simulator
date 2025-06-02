from collections import defaultdict

from utils import RandomWalkOracle, PriceOracle


class Treasury:
    def __init__(self, event_logger=None, event_bus=None, oracle: PriceOracle | None = None):
        self.tokens = defaultdict(float)
        # Track prices for all tokens held by the treasury.  The DAO token is
        # initialised with a default price of ``1.0`` so tests don't need to
        # seed a price before using it.
        self.token_prices = {"DAO_TOKEN": 1.0}
        self._revenue = 0.0
        self.event_logger = event_logger
        self.event_bus = event_bus
        self._price_pressure = defaultdict(float)
        self.oracle: PriceOracle = oracle or RandomWalkOracle()

    def deposit(self, token, amount):
        self.tokens[token] += amount
        self._price_pressure[token] -= amount
        if self.event_bus:
            self.event_bus.publish("token_deposit", step=0, token=token, amount=amount)
        elif self.event_logger:
            self.event_logger.log(0, "token_deposit", token=token, amount=amount)

    def withdraw(self, token, amount):
        if self.tokens[token] >= amount:
            self.tokens[token] -= amount
            withdrawn = amount
        else:
            withdrawn = self.tokens[token]
            self.tokens[token] = 0
        self._price_pressure[token] += withdrawn
        if self.event_bus:
            self.event_bus.publish("token_withdraw", step=0, token=token, amount=withdrawn)
        elif self.event_logger:
            self.event_logger.log(0, "token_withdraw", token=token, amount=withdrawn)
        return withdrawn

    def update_token_price(self, token, new_price):
        self.token_prices[token] = new_price

    def get_token_price(self, token):
        return self.token_prices.get(token, 0.0)

    def update_prices(self, volatility: float = 0.05) -> None:
        """Delegate price updates to the configured oracle."""
        self.oracle.update_prices(self, volatility=volatility)

    def to_dict(self):
        return {
            "tokens": dict(self.tokens),
            "token_prices": self.token_prices,
            "_revenue": self._revenue,
        }

    @classmethod
    def from_dict(cls, data, event_bus=None):
        t = cls(event_bus=event_bus)
        t.tokens = defaultdict(float, data.get("tokens", {}))
        t.token_prices = data.get("token_prices", {"DAO_TOKEN": 1.0})
        t._revenue = data.get("_revenue", 0.0)
        t._price_pressure = defaultdict(float)
        return t

    def get_token_value(self, token):
        """Return the total value of ``token`` held by the treasury."""
        return self.tokens[token] * self.get_token_price(token)

    def get_token_balance(self, token):
        return self.tokens[token]

    @property
    def token_balance(self):
        """Total of all token balances."""
        return sum(self.tokens.values())

    @property
    def reputation_balance(self):
        """Placeholder for future reputation accounting."""
        return 0

    @property
    def funds(self):
        return sum(self.tokens.values())

    def add_revenue(self, amount):
        self._revenue += amount

    def get_revenue_amount(self):
        revenue = self._revenue
        self._revenue = 0.0
        return revenue

