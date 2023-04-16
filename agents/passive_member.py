import random
from agents.dao_member import DAOMember

class PassiveMember(DAOMember):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        if random.random() < self.model.passive_member_observe_probability:
            self.observe_dao()

    def observe_dao(self):
        # Random observation implementation
        observation_type = random.choice(["voting", "proposal", "discussion"])

        if observation_type == "voting":
            self.observe_voting()
        elif observation_type == "proposal":
            self.observe_proposal()
        elif observation_type == "discussion":
            self.observe_discussion()

    def observe_voting(self):
        print(f"Passive Member {self.unique_id} is observing the voting process")

    def observe_proposal(self):
        print(f"Passive Member {self.unique_id} is observing the proposals")

    def observe_discussion(self):
        print(f"Passive Member {self.unique_id} is observing the discussions")
