from collections import defaultdict
from data_structures.treasury import Treasury
from data_structures.proposal import Proposal
from utils import EventBus


class DAO:
    def __init__(
        self,
        name,
        violation_probability=0.1,
        reputation_penalty=5,
        comment_probability=0.5,
        external_partner_interact_probability=0.0,
        event_logger=None,
    ):
        self.name = name
        self.proposals = []
        self.projects = []
        self.disputes = []
        self.violations = []
        self.members = []
        self.event_logger = event_logger
        self.event_bus = EventBus()
        if self.event_logger:
            self.event_bus.subscribe("*", lambda event, step, **d: self.event_logger.log(step, event, **d))
        self.treasury = Treasury(event_bus=self.event_bus)
        self.comment_probability = comment_probability
        self.external_partner_interact_probability = (
            external_partner_interact_probability
        )
        self.violation_probability = violation_probability
        self.reputation_penalty = reputation_penalty
        self.current_step = 0

    def add_proposal(self, proposal):
        proposal.creation_time = self.current_step
        self.proposals.append(proposal)
        if self.event_bus:
            self.event_bus.publish(
                "proposal_created", step=self.current_step, title=proposal.title
            )

    def add_project(self, project):
        self.projects.append(project)

    def add_dispute(self, dispute):
        self.disputes.append(dispute)

    def add_violation(self, violation):
        self.violations.append(violation)

    def add_member(self, member):
        self.members.append(member)

    def remove_proposal(self, proposal):
        self.proposals.remove(proposal)

    def remove_project(self, project):
        self.projects.remove(project)

    def remove_dispute(self, dispute):
        self.disputes.remove(dispute)

    def remove_violation(self, violation):
        self.violations.remove(violation)

    def remove_member(self, member):
        self.members.remove(member)

    def distribute_revenue(self, amount, token):
        # Placeholder for revenue distribution logic
        pass

    def buyback_tokens(self, amount, token="DAO_TOKEN"):
        self.treasury.withdraw(token, amount)

    def stake_tokens(self, amount, token, member, lockup_period=0):
        """Stake ``amount`` of ``token`` on behalf of ``member`` with lockup."""
        if amount <= 0:
            return 0
        stake = min(amount, member.tokens)
        if stake <= 0:
            return 0
        member.tokens -= stake
        member.staked_tokens += stake
        unlock_step = self.current_step + lockup_period
        member.stake_locks.append((stake, unlock_step))
        self.treasury.deposit(token, stake)
        if self.event_bus:
            self.event_bus.publish(
                "tokens_staked",
                step=self.current_step,
                member=member.unique_id,
                token=token,
                amount=stake,
                lockup=lockup_period,
            )
        return stake

    def unstake_tokens(self, amount, token, member):
        """Unstake tokens for ``member`` if lockup expired."""
        if amount <= 0 or member.staked_tokens <= 0:
            return 0

        available = 0
        for stake, unlock in member.stake_locks:
            if self.current_step >= unlock:
                available += stake
        to_unstake = min(amount, available)
        if to_unstake <= 0:
            return 0

        remaining = to_unstake
        new_locks = []
        for stake, unlock in member.stake_locks:
            if self.current_step >= unlock and remaining > 0:
                take = min(stake, remaining)
                stake -= take
                remaining -= take
            if stake > 0:
                new_locks.append((stake, unlock))
        member.stake_locks = new_locks

        member.staked_tokens -= to_unstake
        self.treasury.withdraw(token, to_unstake)
        member.tokens += to_unstake
        if self.event_bus:
            self.event_bus.publish(
                "tokens_unstaked",
                step=self.current_step,
                member=member.unique_id,
                token=token,
                amount=to_unstake,
            )
        return to_unstake

    def to_dict(self):
        return {
            "name": self.name,
            "treasury": self.treasury.to_dict(),
            "members": [m.to_dict() for m in self.members],
            "proposals": [p.to_dict() for p in self.proposals],
            "current_step": self.current_step,
        }

    @classmethod
    def from_dict(cls, data, event_logger=None):
        dao = cls(data.get("name", "DAO"), event_logger=event_logger)
        dao.treasury = Treasury.from_dict(data.get("treasury", {}), event_bus=dao.event_bus)
        # recreate members
        dao.members = []
        from agents.dao_member import DAOMember
        for mdata in data.get("members", []):
            member = DAOMember.from_dict(mdata, dao)
            dao.members.append(member)
        members_by_id = {m.unique_id: m for m in dao.members}
        dao.proposals = [Proposal.from_dict(p, dao, members_by_id) for p in data.get("proposals", [])]
        dao.current_step = data.get("current_step", 0)
        return dao

