from collections import defaultdict
from data_structures.treasury import Treasury

class Guild:
    def __init__(self, name, dao, creator=None):
        self.name = name
        self.dao = dao
        self.members = []
        self.projects = []
        self.treasury = Treasury(event_bus=dao.event_bus)
        self.reputation = defaultdict(int)
        if creator:
            self.add_member(creator)

    def add_member(self, member):
        if member not in self.members:
            self.members.append(member)
            member.guild = self
            if self.dao.event_bus:
                self.dao.event_bus.publish(
                    "guild_joined",
                    step=self.dao.current_step,
                    guild=self.name,
                    member=member.unique_id,
                )

    def remove_member(self, member):
        if member in self.members:
            self.members.remove(member)
            member.guild = None
            if self.dao.event_bus:
                self.dao.event_bus.publish(
                    "guild_left",
                    step=self.dao.current_step,
                    guild=self.name,
                    member=member.unique_id,
                )

    def deposit(self, token, amount):
        self.treasury.deposit(token, amount, step=self.dao.current_step)

    def withdraw(self, token, amount):
        return self.treasury.withdraw(token, amount, step=self.dao.current_step)

    def to_dict(self):
        return {
            "name": self.name,
            "members": [m.unique_id for m in self.members],
            "projects": [p.to_dict() for p in self.projects],
            "treasury": self.treasury.to_dict(),
        }

    @classmethod
    def from_dict(cls, data, dao, members_by_id):
        guild = cls(data.get("name"), dao)
        guild.treasury = Treasury.from_dict(data.get("treasury", {}), event_bus=dao.event_bus)
        for mid in data.get("members", []):
            member = members_by_id.get(mid)
            if member:
                guild.members.append(member)
                member.guild = guild
        from .project import Project
        guild.projects = [Project.from_dict(p, dao, members_by_id) for p in data.get("projects", [])]
        return guild
