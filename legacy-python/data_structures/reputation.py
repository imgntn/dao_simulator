from __future__ import annotations

from collections import defaultdict
from typing import Dict


class ReputationTracker:
    """Track member actions and update reputation based on events."""

    def __init__(self, dao, decay_rate: float = 0.01) -> None:
        self.dao = dao
        self.decay_rate = decay_rate
        self.last_activity: Dict[str, int] = defaultdict(lambda: dao.current_step)
        if getattr(dao, "event_bus", None):
            dao.event_bus.subscribe("project_worked", self._handle_event)
            dao.event_bus.subscribe("service_offered", self._handle_event)
            dao.event_bus.subscribe("proposal_invested", self._handle_event)

    def _get_member(self, uid: str):
        for m in self.dao.members:
            if m.unique_id == uid:
                return m
        return None

    def _handle_event(self, event: str, **data) -> None:
        if event == "project_worked":
            member = self._get_member(data.get("member"))
            if member is not None:
                work = data.get("work", 0)
                member.reputation += work / 10
                self.last_activity[member.unique_id] = self.dao.current_step
        elif event == "service_offered":
            member = self._get_member(data.get("provider"))
            if member is not None:
                member.reputation += 1
                self.last_activity[member.unique_id] = self.dao.current_step
        elif event == "proposal_invested":
            member = self._get_member(data.get("investor"))
            if member is not None:
                amount = data.get("amount", 0)
                member.reputation += amount / 100
                self.last_activity[member.unique_id] = self.dao.current_step

    def decay_reputation(self) -> None:
        """Apply inactivity decay based on ``DAO.current_step``."""
        for member in self.dao.members:
            last = self.last_activity.get(member.unique_id, 0)
            if self.dao.current_step > last:
                member.reputation *= 1 - self.decay_rate
