class DAO:
    def __init__(self):
        self.proposals = []
        self.projects = []
        self.disputes = []
        self.violations = []
        self.external_funds = 0

    def add_proposal(self, proposal):
        self.proposals.append(proposal)

    def get_proposals(self):
        return self.proposals

    def get_open_proposals(self):
        return [proposal for proposal in self.proposals if proposal['status'] == 'open']

    def add_project(self, project):
        self.projects.append(project)

    def get_active_projects(self):
        return [project for project in self.projects if project['status'] == 'active']

    def add_dispute(self, dispute):
        self.disputes.append(dispute)

    def get_open_disputes(self):
        return [dispute for dispute in self.disputes if dispute['status'] == 'open']

    def add_violation(self, violation):
        self.violations.append(violation)

    def get_open_violations(self):
        return [violation for violation in self.violations if violation['status'] == 'open']

    def receive_external_funds(self, amount):
        self.external_funds += amount
