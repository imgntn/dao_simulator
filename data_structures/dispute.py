class Dispute:
    def __init__(self, dispute_id, involved_parties, description, resolution=None):
        self.dispute_id = dispute_id
        self.involved_parties = involved_parties
        self.description = description
        self.resolution = resolution
