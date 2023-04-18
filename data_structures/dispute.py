class Dispute:
    def __init__(self, dao, parties_involved, description):
        self.dao = dao
        self.parties_involved = parties_involved
        self.description = description
        self.resolution = None

    def resolve(self, resolution):
        self.resolution = resolution
