class Proposal:
    def __init__(
        self,
        dao,
        creator,
        title,
        description,
        funding_goal,
        duration,
        topic="Default Topic",
        project=None,
    ):
        self.dao = dao
        self.creator = creator
        self.title = title
        self.description = description
        self.funding_goal = funding_goal
        self.duration = duration
        self.project = project
        self.status = "open"
        self.votes = {}
        self.votes_for = 0
        self.votes_against = 0
        self.comments = []
        self.delegated_support = {}
        self.topic = topic
        self.creation_time = 0
        self.voting_period = duration
        self.current_funding = 0

    def add_vote(self, member, vote, weight=1):
        """Register a vote for the proposal.

        Parameters
        ----------
        member : DAOMember
            The member casting the vote.
        vote : bool
            ``True`` for a yes vote, ``False`` for a no vote.
        weight : int, optional
            The voting weight (defaults to 1).
        """
        if member not in self.votes:
            self.votes[member] = {"vote": vote, "weight": weight}
            if vote:
                self.votes_for += weight
            else:
                self.votes_against += weight
            if self.dao.event_bus:
                self.dao.event_bus.publish(
                    "vote_cast",
                    step=self.dao.current_step,
                    proposal=self.title,
                    member=member.unique_id,
                    vote=vote,
                    weight=weight,
                )

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})
        if self.dao.event_bus:
            self.dao.event_bus.publish(
                "comment_added",
                step=self.dao.current_step,
                proposal=self.title,
                member=member.unique_id,
                sentiment=sentiment,
            )

    def receive_delegated_support(self, delegator, token_amount):
        if delegator in self.delegated_support:
            self.delegated_support[delegator] += token_amount
        else:
            self.delegated_support[delegator] = token_amount

    def receive_investment(self, investor, amount):
        """Record an investment toward the proposal."""
        self.current_funding += amount

    @property
    def closed(self):
        return self.status != "open"

    def to_dict(self):
        return {
            "title": self.title,
            "description": self.description,
            "funding_goal": self.funding_goal,
            "duration": self.duration,
            "topic": self.topic,
            "status": self.status,
            "votes_for": self.votes_for,
            "votes_against": self.votes_against,
            "current_funding": self.current_funding,
            "creator": getattr(self.creator, "unique_id", None),
            "creation_time": self.creation_time,
            "voting_period": self.voting_period,
        }

    @classmethod
    def from_dict(cls, data, dao, members_by_id):
        creator = members_by_id.get(data.get("creator"))
        proposal = cls(
            dao,
            creator,
            data.get("title"),
            data.get("description"),
            data.get("funding_goal"),
            data.get("duration"),
            topic=data.get("topic", "Default Topic"),
        )
        proposal.status = data.get("status", "open")
        proposal.votes_for = data.get("votes_for", 0)
        proposal.votes_against = data.get("votes_against", 0)
        proposal.current_funding = data.get("current_funding", 0)
        proposal.creation_time = data.get("creation_time", 0)
        proposal.voting_period = data.get("voting_period", proposal.duration)
        return proposal
