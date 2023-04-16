class DAO:
    def __init__(self, name):
        self.name = name
        self.members = []
        self.proposals = []
        self.projects = []
        self.violations = []
        self.treasury = Treasury()

    def add_member(self, member):
        self.members.append(member)

    def add_proposal(self, proposal):
        self.proposals.append(proposal)

    def add_project(self, project):
        self.projects.append(project)

    def add_violation(self, violation):
        self.violations.append(violation)

class Treasury:
    def __init__(self):
        self.native_token_name = "DAO Token"
        self.holdings = {self.native_token_name: 0}

    def add_native_tokens(self, amount):
        self.holdings[self.native_token_name] += amount

    def add_external_tokens(self, token_name, amount):
        if token_name not in self.holdings:
            self.holdings[token_name] = 0
        self.holdings[token_name] += amount

    def withdraw_native_tokens(self, amount):
        if self.holdings[self.native_token_name] >= amount:
            self.holdings[self.native_token_name] -= amount
            return amount
        else:
            return 0

    def withdraw_external_tokens(self, token_name, amount):
        if token_name in self.holdings and self.holdings[token_name] >= amount:
            self.holdings[token_name] -= amount
            return amount
        else:
            return 0
