class EventEngine:
    """Load and trigger events from a YAML or JSON configuration."""

    def __init__(self, path: str | None = None) -> None:
        """Initialize the engine with an optional file path."""
        self.events: list[dict] = self._load(path) if path else []
        self.by_step: dict[int, list[dict]] = {}
        for evt in self.events:
            step = int(evt.get("step", 0))
            self.by_step.setdefault(step, []).append(evt)

    def _load(self, path: str) -> list[dict]:
        import json
        if path.endswith((".yaml", ".yml")):
            try:
                import yaml  # type: ignore
            except Exception as e:  # pragma: no cover - optional dep
                raise ImportError("PyYAML is required for YAML events") from e
            with open(path) as f:
                data = yaml.safe_load(f) or []
        else:
            with open(path) as f:
                data = json.load(f)
        if isinstance(data, dict):
            data = data.get("events", [])
        if not isinstance(data, list):
            raise ValueError("Event file must contain a list")
        return data

    def trigger_events(self, step: int, sim) -> None:
        """Execute any events scheduled for ``step``."""
        events = self.by_step.pop(step, [])
        for evt in events:
            etype = evt.get("type")
            if etype == "market_shock":
                severity = evt.get("severity")
                sim.trigger_market_shock(severity)
            elif etype == "marketing_campaign":
                self._run_campaign(evt, sim)
            elif etype == "create_proposal":
                self._create_proposal(evt, sim)

    def add_event(self, event: dict) -> None:
        """Schedule a new event at runtime."""
        self.events.append(event)
        step = int(event.get("step", 0))
        self.by_step.setdefault(step, []).append(event)

    def list_events(self) -> list:
        """Return all loaded events."""
        return list(self.events)

    def _run_campaign(self, evt: dict, sim) -> None:
        from data_structures.marketing_events import (
            DemandBoostCampaign,
            RecruitmentCampaign,
            SocialMediaCampaign,
            ReferralBonusCampaign,
        )

        ctype = evt.get("campaign_type", "social_media")
        budget = float(evt.get("budget", 50))
        if ctype == "demand_boost":
            camp = DemandBoostCampaign(
                sim.dao,
                budget,
                evt.get("price_boost", 0.1),
            )
        elif ctype == "recruitment":
            camp = RecruitmentCampaign(
                sim.dao,
                budget,
                int(evt.get("recruits", 2)),
            )
        elif ctype == "referral_bonus":
            camp = ReferralBonusCampaign(
                sim.dao,
                budget,
                int(evt.get("recruits", 1)),
                float(evt.get("bonus", 10)),
            )
        else:
            camp = SocialMediaCampaign(
                sim.dao,
                budget,
                evt.get("price_boost", 0.05),
            )
        camp.execute(sim)

    def _create_proposal(self, evt: dict, sim) -> None:
        from utils.proposal_utils import create_random_proposal
        creator = sim.dao.members[0] if sim.dao.members else None
        title = evt.get("title", "Event Proposal")
        proposal = create_random_proposal(sim.dao, creator, title_prefix=title)
        if proposal:
            sim.dao.add_proposal(proposal)
            if creator:
                creator.submit_proposal(proposal)
