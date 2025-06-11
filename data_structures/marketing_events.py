import random


class MarketingCampaign:
    """Base class for marketing campaigns affecting the DAO."""

    def __init__(self, dao, budget: float = 50):
        self.dao = dao
        self.budget = budget

    def execute(self, sim):
        raise NotImplementedError


class DemandBoostCampaign(MarketingCampaign):
    """Increase token price by spending treasury funds on promotion."""

    def __init__(self, dao, budget: float = 50, price_boost: float = 0.1):
        super().__init__(dao, budget)
        self.price_boost = price_boost

    def execute(self, sim):
        spent = self.dao.treasury.withdraw("DAO_TOKEN", self.budget)
        old_price = self.dao.treasury.get_token_price("DAO_TOKEN")
        new_price = old_price * (1 + self.price_boost)
        self.dao.treasury.update_token_price("DAO_TOKEN", new_price)
        if self.dao.event_bus:
            self.dao.event_bus.publish(
                "marketing_campaign",
                step=self.dao.current_step,
                type="demand_boost",
                budget=spent,
                old_price=old_price,
                new_price=new_price,
            )


class RecruitmentCampaign(MarketingCampaign):
    """Attract new members to the DAO using marketing funds."""

    def __init__(self, dao, budget: float = 50, recruits: int = 2):
        super().__init__(dao, budget)
        self.recruits = recruits

    def execute(self, sim):
        from agents.passive_member import PassiveMember

        spent = self.dao.treasury.withdraw("DAO_TOKEN", self.budget)
        price = self.dao.treasury.get_token_price("DAO_TOKEN")
        new_ids = []
        for i in range(self.recruits):
            uid = f"Recruit_{sim.schedule.steps}_{i}"
            member = PassiveMember(uid, model=self.dao, tokens=100, reputation=0, location="global")
            self.dao.add_member(member)
            sim.schedule.add(member)
            new_ids.append(uid)
        if self.dao.event_bus:
            self.dao.event_bus.publish(
                "marketing_campaign",
                step=self.dao.current_step,
                type="recruitment",
                budget=spent,
                new_members=new_ids,
                old_price=price,
                new_price=price,
            )


class SocialMediaCampaign(MarketingCampaign):
    """Run a small social media push to slightly boost token demand."""

    def __init__(self, dao, budget: float = 20, price_boost: float = 0.05):
        super().__init__(dao, budget)
        self.price_boost = price_boost

    def execute(self, sim):
        spent = self.dao.treasury.withdraw("DAO_TOKEN", self.budget)
        old_price = self.dao.treasury.get_token_price("DAO_TOKEN")
        new_price = old_price * (1 + self.price_boost)
        self.dao.treasury.update_token_price("DAO_TOKEN", new_price)
        if self.dao.event_bus:
            self.dao.event_bus.publish(
                "marketing_campaign",
                step=self.dao.current_step,
                type="social_media",
                budget=spent,
                old_price=old_price,
                new_price=new_price,
            )


class ReferralBonusCampaign(MarketingCampaign):
    """Reward existing members for recruiting friends."""

    def __init__(self, dao, budget: float = 60, recruits: int = 1, bonus: float = 10):
        super().__init__(dao, budget)
        self.recruits = recruits
        self.bonus = bonus

    def execute(self, sim):
        from agents.passive_member import PassiveMember

        spent = self.dao.treasury.withdraw("DAO_TOKEN", self.budget)
        price = self.dao.treasury.get_token_price("DAO_TOKEN")
        new_ids = []
        referrer = random.choice(self.dao.members) if self.dao.members else None
        if referrer:
            referrer.tokens += self.bonus
        for i in range(self.recruits):
            uid = f"Referral_{sim.schedule.steps}_{i}"
            member = PassiveMember(uid, model=self.dao, tokens=100, reputation=0, location="global")
            self.dao.add_member(member)
            sim.schedule.add(member)
            new_ids.append(uid)
        if self.dao.event_bus:
            self.dao.event_bus.publish(
                "marketing_campaign",
                step=self.dao.current_step,
                type="referral_bonus",
                budget=spent,
                new_members=new_ids,
                referrer=getattr(referrer, "unique_id", None),
                old_price=price,
                new_price=price,
            )

