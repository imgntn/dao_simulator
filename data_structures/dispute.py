class Dispute:
    def __init__(
        self,
        dao,
        parties_involved,
        description,
        importance=1,
        project=None,
        member=None,
    ):
        self.dao = dao
        self.parties_involved = parties_involved
        self.description = description
        self.importance = importance
        self.project = project
        self.member = member
        self.resolution = None
        self.resolved = False

    def resolve(self, resolution):
        self.resolution = resolution
        self.resolved = True
