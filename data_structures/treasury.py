from collections import defaultdict


class Treasury:
    def __init__(self, event_logger=None):
        self.tokens = defaultdict(float)
        self.token_prices = {}
        self._revenue = 0.0
        self.event_logger = event_logger

    def deposit(self, token, amount):
        self.tokens[token] += amount
        if self.event_logger:
            self.event_logger.log(0, "token_deposit", token=token, amount=amount)

    def withdraw(self, token, amount):
        if self.tokens[token] >= amount:
            self.tokens[token] -= amount
            withdrawn = amount
        else:
            withdrawn = self.tokens[token]
            self.tokens[token] = 0
        if self.event_logger:
            self.event_logger.log(0, "token_withdraw", token=token, amount=withdrawn)
        return withdrawn

    def update_token_price(self, token, new_price):
        self.token_prices[token] = new_price

    def get_token_price(self, token):
        return self.token_prices[token]

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

