from data_structures.treasury import Treasury


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
