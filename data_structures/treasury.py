from collections import defaultdict


class Treasury:
    def __init__(self):
        self.tokens = defaultdict(float)
        self.token_prices = {}

    def deposit(self, token, amount):
        self.tokens[token] += amount

    def withdraw(self, token, amount):
        self.tokens[token] -= amount

    def update_token_price(self, token, new_price):
        self.token_prices[token] = new_price

    def get_token_price(self, token):
        return self.token_prices[token]

    def get_token_balance(self, token):
        return self.tokens[token]
