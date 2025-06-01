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
            if self.dao.event_logger:
                self.dao.event_logger.log(
                    self.dao.current_step,
                    "vote_cast",
                    proposal=self.title,
                    member=member.unique_id,
                    vote=vote,
                    weight=weight,
                )

    def add_comment(self, member, sentiment):
        self.comments.append({"member": member, "sentiment": sentiment})
        if self.dao.event_logger:
            self.dao.event_logger.log(
                self.dao.current_step,
                "comment_added",
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
