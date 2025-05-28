from collections import defaultdict


class Treasury:
    def __init__(self):
        self.tokens = defaultdict(float)
        self.token_prices = {}
        self._revenue = 0.0

    def deposit(self, token, amount):
        self.tokens[token] += amount

    def withdraw(self, token, amount):
        if self.tokens[token] >= amount:
            self.tokens[token] -= amount
            return amount
        withdrawn = self.tokens[token]
        self.tokens[token] = 0
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

