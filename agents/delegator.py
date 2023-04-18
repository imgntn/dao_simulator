import random
from agents.dao_member import DAOMember


class Delegator(DAOMember):
    def __init__(
        self,
        unique_id,
        model,
        tokens,
        reputation,
        location,
        voting_strategy,
        delegation_probability,
    ):
        super().__init__(
            unique_id, model, tokens, reputation, location, voting_strategy
        )
        self.delegation_probability = delegation_probability

    def step(self):
        self.vote_on_random_proposal()
        self.leave_comment_on_random_proposal()
        if random.random() < self.delegation_probability:
            self.delegate()

    def delegate(self):
        # Implementation of delegating tokens to other members
        recipient = self.choose_delegate_recipient()
        if recipient:
            delegation_amount = random.randint(1, self.tokens)
            self.tokens -= delegation_amount
            recipient.tokens += delegation_amount

    def choose_delegate_recipient(self):
        # Implementation of selecting a member to delegate tokens to
        potential_recipients = [
            member
            for member in self.model.dao.members
            if member.unique_id != self.unique_id
        ]
        if potential_recipients:
            recipient = random.choice(potential_recipients)
            return recipient
        else:
            return None
