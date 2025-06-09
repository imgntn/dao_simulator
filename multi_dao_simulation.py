"""Manage multiple DAOs in one simulation."""
from __future__ import annotations
import random
from typing import List

from dao_simulation import DAOSimulation
from data_structures.proposal import FundingProposal


class MultiDAOSimulation:
    """Run several :class:`DAOSimulation` instances side by side."""

    def __init__(self, num_daos: int = 2, enable_cross_dao: bool = False, **kwargs) -> None:
        self.daos: List[DAOSimulation] = [DAOSimulation(**kwargs) for _ in range(num_daos)]
        self.enable_cross_dao = enable_cross_dao

    def transfer_tokens(self, src: int, dst: int, amount: float, token: str = "DAO_TOKEN") -> None:
        """Move ``amount`` of ``token`` from DAO ``src`` to DAO ``dst``."""
        dao_a = self.daos[src].dao
        dao_b = self.daos[dst].dao
        withdrawn = dao_a.treasury.withdraw(token, amount)
        dao_b.treasury.deposit(token, withdrawn)
        if dao_a.event_bus:
            dao_a.event_bus.publish(
                "cross_dao_token_transfer",
                step=self.daos[src].schedule.steps,
                target=dst,
                token=token,
                amount=withdrawn,
            )
        if dao_b.event_bus:
            dao_b.event_bus.publish(
                "cross_dao_token_received",
                step=self.daos[dst].schedule.steps,
                source=src,
                token=token,
                amount=withdrawn,
            )

    def migrate_member(self, member_id: str, src: int, dst: int) -> None:
        """Move a member from DAO ``src`` to ``dst``."""
        dao_a = self.daos[src]
        dao_b = self.daos[dst]
        member = next(m for m in dao_a.dao.members if m.unique_id == member_id)
        dao_a.dao.remove_member(member)
        dao_a.schedule.remove(member)
        dao_b.dao.add_member(member)
        dao_b.schedule.add(member)
        member.model = dao_b.dao
        if dao_a.dao.event_bus:
            dao_a.dao.event_bus.publish(
                "member_migrated_out",
                step=dao_a.schedule.steps,
                member=member_id,
                target=dst,
            )
        if dao_b.dao.event_bus:
            dao_b.dao.event_bus.publish(
                "member_migrated_in",
                step=dao_b.schedule.steps,
                member=member_id,
                source=src,
            )

    def _maybe_cross_proposal(self) -> None:
        if len(self.daos) < 2:
            return
        src, dst = random.sample(range(len(self.daos)), 2)
        dao_a = self.daos[src].dao
        dao_b = self.daos[dst].dao
        if not dao_a.members:
            return
        member = random.choice(dao_a.members)
        proposal = FundingProposal(dao_b, member, "Cross Funding", "", 1, 1, project=None)
        dao_b.add_proposal(proposal)
        if dao_a.event_bus:
            dao_a.event_bus.publish(
                "cross_dao_proposal",
                step=self.daos[src].schedule.steps,
                target=dst,
                proposal=proposal.title,
            )

    def step(self) -> None:
        for sim in self.daos:
            sim.step()
        if self.enable_cross_dao:
            self._maybe_cross_proposal()

    def run(self, steps: int) -> None:
        for _ in range(steps):
            self.step()
        for sim in self.daos:
            sim.finalize()
