from collections import defaultdict
from data_structures.treasury import Treasury
from data_structures.proposal import Proposal
from data_structures.guild import Guild
from data_structures.prediction_market import PredictionMarket
from utils import EventBus


class DAO:
    def __init__(
        self,
        name,
        violation_probability=0.1,
        reputation_penalty=5,
        comment_probability=0.5,
        external_partner_interact_probability=0.0,
        staking_interest_rate=0.0,
        slash_fraction=0.0,
        reputation_decay_rate=0.0,
        event_logger=None,
    ):
        self.name = name
        self.proposals = []
        self.projects = []
        self.disputes = []
        self.violations = []
        self.members = []
        self.guilds = []
        self.event_logger = event_logger
        async_bus = bool(event_logger and getattr(event_logger, "async_logging", False))
        self.event_bus = EventBus(async_mode=async_bus)
        if self.event_logger:
            self.event_bus.subscribe(
                "*",
                lambda event, step, **d: self.event_logger.log(step, event, **d),
            )
        self.treasury = Treasury(event_bus=self.event_bus)
        self.prediction_market = PredictionMarket(
            self, self.treasury, event_bus=self.event_bus
        )
        # ``marketplace`` gets assigned by :class:`DAOSimulation` once created
        # so agents can access ``self.model.marketplace`` during their step.
        self.marketplace = None
        self.comment_probability = comment_probability
        self.external_partner_interact_probability = (
            external_partner_interact_probability
        )
        self.violation_probability = violation_probability
        self.reputation_penalty = reputation_penalty
        self.staking_interest_rate = staking_interest_rate
        self.slash_fraction = slash_fraction
        self.reputation_decay_rate = reputation_decay_rate
        self.current_step = 0
        self.market_shocks = []
        self.current_shock = 0.0

    def add_proposal(self, proposal):
        proposal.creation_time = self.current_step
        if not getattr(proposal, "unique_id", None):
            proposal.unique_id = f"proposal_{len(self.proposals)}"
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

    def create_guild(self, name, creator=None):
        guild = Guild(name, self, creator=creator)
        self.guilds.append(guild)
        if self.event_bus:
            self.event_bus.publish(
                "guild_created",
                step=self.current_step,
                guild=name,
                creator=getattr(creator, "unique_id", None),
            )
        return guild

    def remove_guild(self, guild):
        if guild in self.guilds:
            self.guilds.remove(guild)
            if self.event_bus:
                self.event_bus.publish(
                    "guild_removed",
                    step=self.current_step,
                    guild=guild.name,
                )

    def find_guild_by_name(self, name):
        for g in self.guilds:
            if g.name == name:
                return g
        return None

    def distribute_revenue(self, amount, token):
        total_staked = sum(m.staked_tokens for m in self.members)
        if amount <= 0 or total_staked <= 0:
            return 0
        for member in self.members:
            if member.staked_tokens <= 0:
                continue
            share = amount * (member.staked_tokens / total_staked)
            member.tokens += share
            if self.event_bus:
                self.event_bus.publish(
                    "revenue_share",
                    step=self.current_step,
                    member=member.unique_id,
                    token=token,
                    amount=share,
                )
        return amount

    def buyback_tokens(self, amount, token="DAO_TOKEN"):
        self.treasury.withdraw(token, amount, step=self.current_step)

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
        self.treasury.deposit(token, stake, step=self.current_step)
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
        self.treasury.withdraw(token, to_unstake, step=self.current_step)
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

    def apply_staking_interest(self):
        """Accrue staking interest for all members."""
        for member in self.members:
            if member.staked_tokens > 0:
                rate = getattr(member, "staking_rate", self.staking_interest_rate)
                if rate <= 0:
                    continue
                reward = member.staked_tokens * rate
                member.tokens += reward
                if getattr(member, "compound_stake", False):
                    member.staked_tokens += reward
                if self.event_bus:
                    self.event_bus.publish(
                        "staking_reward",
                        step=self.current_step,
                        member=member.unique_id,
                        amount=reward,
                    )

    def slash_member(self, member, fraction=None, *, severity: float = 1.0):
        """Slash a fraction of ``member``'s staked tokens."""
        if fraction is None:
            fraction = self.slash_fraction
        fraction *= max(min(severity, 1.0), 0.0)
        if fraction <= 0 or member.staked_tokens <= 0:
            return 0
        amount = member.staked_tokens * fraction
        member.staked_tokens -= amount
        self.treasury.withdraw("DAO_TOKEN", amount, step=self.current_step)
        if self.event_bus:
            self.event_bus.publish(
                "stake_slashed",
                step=self.current_step,
                member=member.unique_id,
                amount=amount,
            )
        return amount

    def apply_reputation_decay(self):
        """Reduce reputation for inactive members."""
        if self.reputation_decay_rate <= 0:
            return
        for member in self.members:
            if not getattr(member, "_active", False):
                member.reputation *= 1 - self.reputation_decay_rate

    def increment_step(self):
        """Advance DAO time and resolve pending predictions."""
        self.current_step += 1
        if getattr(self, "prediction_market", None):
            self.prediction_market.resolve_predictions(self.current_step)

    def to_dict(self):
        return {
            "name": self.name,
            "treasury": self.treasury.to_dict(),
            "members": [m.to_dict() for m in self.members],
            "guilds": [g.to_dict() for g in self.guilds],
            "proposals": [p.to_dict() for p in self.proposals],
            "market_shocks": [s.to_dict() for s in self.market_shocks],
            "current_step": self.current_step,
            "staking_interest_rate": self.staking_interest_rate,
            "slash_fraction": self.slash_fraction,
            "reputation_decay_rate": self.reputation_decay_rate,
        }

    @classmethod
    def from_dict(cls, data, event_logger=None):
        dao = cls(
            data.get("name", "DAO"),
            staking_interest_rate=data.get("staking_interest_rate", 0.0),
            slash_fraction=data.get("slash_fraction", 0.0),
            reputation_decay_rate=data.get("reputation_decay_rate", 0.0),
            event_logger=event_logger,
        )
        dao.treasury = Treasury.from_dict(data.get("treasury", {}), event_bus=dao.event_bus)
        # recreate members
        dao.members = []
        from agents.dao_member import DAOMember
        for mdata in data.get("members", []):
            member = DAOMember.from_dict(mdata, dao)
            dao.members.append(member)
        members_by_id = {m.unique_id: m for m in dao.members}
        dao.guilds = [Guild.from_dict(g, dao, members_by_id) for g in data.get("guilds", [])]
        dao.proposals = [Proposal.from_dict(p, dao, members_by_id) for p in data.get("proposals", [])]
        from .market_shock import MarketShock
        dao.market_shocks = [MarketShock.from_dict(s) for s in data.get("market_shocks", [])]
        dao.current_step = data.get("current_step", 0)
        dao.marketplace = None
        return dao

