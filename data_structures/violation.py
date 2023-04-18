class Violation:
    def __init__(self, violator, project, description):
        self.violator = violator
        self.project = project
        self.description = description
        self.resolved = False

    def resolve(self):
        self.resolved = True
