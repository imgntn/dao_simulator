# File: dao_simulation/dao_simulation.py
try:
    from mesa import Model
except ImportError:
    # Fallback for testing environments without Mesa
    class Model:
        """Minimal stand-in for :class:`mesa.Model` used in tests."""

        pass


class RandomActivation:
    """Simplistic scheduler keeping track of steps."""

    def __init__(self, model):
        self.model = model
        self.agents = []
        self.steps = 0

    def add(self, agent):
        self.agents.append(agent)

    def remove(self, agent):
        if agent in self.agents:
            self.agents.remove(agent)

    def step(self):
        for agent in list(self.agents):
            if hasattr(agent, "step"):
                agent.step()
        self.steps += 1


class ParallelActivation(RandomActivation):
    """Execute agent steps in parallel using threads."""

    def __init__(self, model, workers=None):
        super().__init__(model)
        self.workers = workers

    def step(self):
        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=self.workers) as exc:
            for agent in list(self.agents):
                if hasattr(agent, "step"):
                    exc.submit(agent.step)
        self.steps += 1


class AsyncActivation(RandomActivation):
    """Execute agent steps concurrently using ``asyncio``."""

    async def _async_step(self):
        import asyncio

        tasks = []
        for agent in list(self.agents):
            if hasattr(agent, "step"):
                tasks.append(asyncio.to_thread(agent.step))
        await asyncio.gather(*tasks)
        self.steps += 1

    def step(self):
        import asyncio

        asyncio.run(self._async_step())


class SimpleDataCollector:
    """Collect a few statistics from the model each step."""

    def __init__(self, dao=None, *, centrality_interval: int = 1):
        self.model_vars = []
        self.event_counts = {}
        self.price_history: list[float] = []
        self.gini_history: list[float] = []
        self.reputation_gini_history: list[float] = []
        self.avg_token_history: list[float] = []
        self.delegation_centrality: list[dict[str, float]] = []
        self.token_ranking_history: list[list[tuple[str, float]]] = []
        self.influence_ranking_history: list[list[tuple[str, float]]] = []
        self.achievements: dict[str, str] = {}
        self.centrality_interval = max(1, int(centrality_interval))
        self.last_centrality_step: int | None = None
        self.dao = dao
        self.campaign_history: list[dict] = []
        self._last_campaign: dict | None = None
        if dao is not None:
            dao.event_bus.subscribe("*", self._handle_event)

    def _handle_event(self, event: str, **_):
        self.event_counts[event] = self.event_counts.get(event, 0) + 1
        if event == "marketing_campaign":
            prev_price = _.get(
                "old_price",
                self.price_history[-1]
                if self.price_history
                else self.dao.treasury.get_token_price("DAO_TOKEN"),
            )
            new_price = _.get("new_price", prev_price)
            entry = {
                "step": self.dao.current_step,
                "type": _.get("type"),
                "tokens_spent": _.get("budget", 0),
                "members_gained": len(_.get("new_members", [])),
                "price_impact": new_price - prev_price,
            }
            self._last_campaign = entry
            self.campaign_history.append(entry)

    def collect(self, model):
        members = model.dao.members
        avg_rep = sum(m.reputation for m in members) / len(members) if members else 0
        total_tokens = sum(m.tokens for m in members)
        avg_tokens = total_tokens / len(members) if members else 0.0
        gini_coeff = gini([m.tokens for m in members]) if members else 0.0
        rep_gini = gini([m.reputation for m in members]) if members else 0.0
        price = model.dao.treasury.get_token_price("DAO_TOKEN")
        self.price_history.append(price)
        self.gini_history.append(gini_coeff)
        self.avg_token_history.append(avg_tokens)
        self.reputation_gini_history.append(rep_gini)
        step = model.schedule.steps
        if (
            self.last_centrality_step is None
            or step % self.centrality_interval == 0
        ):
            centrality = in_degree_centrality(members)
            self.last_centrality_step = step
        else:
            centrality = (
                self.delegation_centrality[-1]
                if self.delegation_centrality
                else {}
            )
        self.delegation_centrality.append(centrality)

        token_rank = sorted(
            [(m.unique_id, m.tokens) for m in members],
            key=lambda x: x[1],
            reverse=True,
        )
        influence_rank = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
        self.token_ranking_history.append(token_rank)
        self.influence_ranking_history.append(influence_rank)

        if "first_1000_tokens" not in self.achievements:
            for mid, tok in token_rank:
                if tok >= FIRST_1000_TOKENS_THRESHOLD:
                    self.achievements["first_1000_tokens"] = mid
                    if getattr(model.dao, "event_bus", None):
                        model.dao.event_bus.publish(
                            "achievement",
                            step=model.schedule.steps,
                            member=mid,
                            achievement="first_1000_tokens",
                        )
                    break
        row = {
            "step": model.schedule.steps,
            "num_members": len(members),
            "num_proposals": len(model.dao.proposals),
            "num_projects": len(model.dao.projects),
            "avg_reputation": avg_rep,
            "avg_tokens": avg_tokens,
            "total_tokens": total_tokens,
            "gini_coefficient": gini_coeff,
            "reputation_gini": rep_gini,
            "event_count": sum(self.event_counts.values()),
            "dao_token_price": price,
        }
        try:
            from utils.metric_plugins import get_metrics
            from utils.logging_config import get_logger
            logger = get_logger(__name__)

            for func in get_metrics().values():
                try:
                    extra = func(model)
                    if isinstance(extra, dict):
                        row.update(extra)
                except (AttributeError, TypeError, ValueError) as e:
                    logger.warning(f"Metric function {func.__name__} failed: {e}")
                except Exception as e:
                    logger.error(f"Unexpected error in metric function {func.__name__}: {e}")
        except ImportError as e:
            from utils.logging_config import get_logger
            logger = get_logger(__name__)
            logger.debug(f"Metric plugins not available: {e}")
        except Exception as e:
            from utils.logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(f"Unexpected error loading metric plugins: {e}")
        row["delegation_centrality"] = centrality
        row["token_ranking"] = token_rank
        row["influence_ranking"] = influence_rank
        if self._last_campaign:
            row["campaign_type"] = self._last_campaign.get("type")
            row["campaign_tokens_spent"] = self._last_campaign.get("tokens_spent", 0)
            row["campaign_members_gained"] = self._last_campaign.get("members_gained", 0)
            row["campaign_price_impact"] = self._last_campaign.get("price_impact", 0.0)
            self._last_campaign = None
        else:
            row["campaign_type"] = None
            row["campaign_tokens_spent"] = 0
            row["campaign_members_gained"] = 0
            row["campaign_price_impact"] = 0.0
        self.model_vars.append(row)


class CSVDataCollector:
    """Write collected model variables to a CSV file."""

    def __init__(self, filename):
        self.filename = filename
        self.headers = [
            "step",
            "num_members",
            "num_proposals",
            "num_projects",
            "avg_tokens",
            "gini_coefficient",
            "reputation_gini",
            "dao_token_price",
        ]

    def write(self, model_vars):
        import csv

        with open(self.filename, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.headers)
            writer.writeheader()
            for row in model_vars:
                writer.writerow({h: row.get(h) for h in self.headers})


class SQLiteDataCollector:
    """Persist collected variables to an SQLite database."""

    def __init__(self, filename: str) -> None:
        import sqlite3

        self.conn = sqlite3.connect(filename)
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS stats (
            step INTEGER,
            num_members INTEGER,
            num_proposals INTEGER,
            num_projects INTEGER,
            avg_reputation REAL,
            avg_tokens REAL,
            total_tokens REAL,
            gini_coefficient REAL,
            reputation_gini REAL,
            event_count INTEGER,
            dao_token_price REAL
        )"""
        )
        self.conn.commit()

    def write_row(self, row: dict) -> None:
        self.conn.execute(
            "INSERT INTO stats VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (
                row.get("step"),
                row.get("num_members"),
                row.get("num_proposals"),
                row.get("num_projects"),
                row.get("avg_reputation"),
                row.get("avg_tokens"),
                row.get("total_tokens"),
                row.get("gini_coefficient"),
                row.get("reputation_gini"),
                row.get("event_count"),
                row.get("dao_token_price"),
            ),
        )
        self.conn.commit()

    def close(self) -> None:
        if self.conn:
            self.conn.close()
            self.conn = None


# Standard library imports
import json
import math
import random

# Local imports
from agents import (
    AdaptiveInvestor,
    Arbitrator,
    Artist,
    Auditor,
    BountyHunter,
    Collector,
    Delegator,
    Developer,
    ExternalPartner,
    Investor,
    LiquidDelegator,
    PassiveMember,
    ProposalCreator,
    RLTrader,
    Regulator,
    ServiceProvider,
    Speculator,
    Trader,
    Validator,
)
from constants import (
    ADAPTIVE_INVESTOR_BUDGET,
    ADAPTIVE_INVESTOR_TOKENS,
    ARBITRATOR_CAPACITY,
    ARBITRATOR_TOKENS,
    ARTIST_TOKENS,
    AUDITOR_TOKENS,
    BOUNTY_HUNTER_REPUTATION,
    BOUNTY_HUNTER_TOKENS,
    BUYBACK_FUND_THRESHOLD,
    BUYBACK_PERCENTAGE,
    BUYBACK_PRICE_THRESHOLD,
    COLLECTOR_TOKENS,
    DEFAULT_ADAPTIVE_EPSILON,
    DEFAULT_ADAPTIVE_LEARNING_RATE,
    DEFAULT_AGENT_REPUTATION,
    DEFAULT_AGENT_TOKENS,
    DELEGATOR_BUDGET,
    DELEGATOR_TOKENS,
    DEVELOPER_TOKENS,
    EXTERNAL_PARTNER_TOKENS,
    FIRST_1000_TOKENS_THRESHOLD,
    INITIAL_TREASURY_FUNDING,
    INVESTOR_BUDGET,
    INVESTOR_TOKENS,
    LIQUID_DELEGATOR_BUDGET,
    LIQUID_DELEGATOR_TOKENS,
    MARKETING_BUDGET_BOOST,
    MARKET_SHOCK_RANGE,
    MIN_TOKEN_PRICE,
    MIN_TREASURY_RESERVE,
    NEW_MEMBER_COST,
    NEW_MEMBER_FUND_REQUIREMENT,
    NEW_MEMBER_INTERVAL,
    NEW_MEMBERS_PER_INTERVAL,
    PASSIVE_MEMBER_TOKENS,
    PLAYER_TOKENS,
    PROPOSAL_CREATOR_TOKENS,
    REGULATOR_TOKENS,
    SERVICE_PROVIDER_BUDGET,
    SERVICE_PROVIDER_TOKENS,
    SPECULATOR_TOKENS,
    TRADER_TOKENS,
    VALIDATOR_TOKENS,
)
from data_structures import (
    BountyProposal,
    FundingProposal,
    GovernanceProposal,
    MembershipProposal,
    NFTMarketplace,
    Project,
    QuadraticFundingProposal,
    ReputationTracker,
)
from data_structures.dao import DAO
from settings import settings
from utils import EventLogger, gini, in_degree_centrality
from utils.agent_manager import AgentManager
from utils.event_engine import EventEngine
from utils.locations import generate_random_location
from visualizations import generate_report
from visualizations.network_graph import compute_network_data


class DAOSimulation(Model):
    def __init__(
        self,
        export_csv: bool = False,
        csv_filename: str = "simulation_data.csv",
        use_parallel: bool = False,
        use_async: bool = False,
        max_workers: int | None = None,
        event_logging: bool = False,
        event_log_filename: str = "events.csv",
        event_db_filename: str | None = None,
        stats_db_filename: str | None = None,
        compress_events: str | None = None,
        checkpoint_interval: int | None = None,
        checkpoint_path: str | None = None,
        num_developers: int | None = None,
        num_investors: int | None = None,
        num_traders: int | None = None,
        num_adaptive_investors: int | None = None,
        num_delegators: int | None = None,
        num_liquid_delegators: int | None = None,
        num_proposal_creators: int | None = None,
        num_validators: int | None = None,
        num_service_providers: int | None = None,
        num_arbitrators: int | None = None,
        num_regulators: int | None = None,
        num_auditors: int | None = None,
        num_bounty_hunters: int | None = None,
        num_external_partners: int | None = None,
        num_passive_members: int | None = None,
        num_artists: int | None = None,
        num_collectors: int | None = None,
        num_speculators: int | None = None,
        comment_probability: float | None = None,
        external_partner_interact_probability: float | None = None,
        violation_probability: float | None = None,
        reputation_penalty: int | None = None,
        staking_interest_rate: float | None = None,
        slash_fraction: float | None = None,
        reputation_decay_rate: float | None = None,
        market_shock_frequency: int | None = None,
        market_shock_file: str | None = None,
        adaptive_learning_rate: float | None = None,
        adaptive_epsilon: float | None = None,
        governance_rule: str | None = None,
        report_file: str | None = None,
        seed: int | None = None,
        events_file: str | None = None,
        enable_marketing: bool | None = None,
        marketing_level: str | None = None,
        enable_player: bool | None = None,
        token_emission_rate: float | None = None,
        token_burn_rate: float | None = None,
        scenario_file: str | None = None,
        centrality_interval: int = 1,
        _: object = None,
        **kwargs: object,
    ) -> None:
        try:
            # Try to initialize Mesa Model which sets up random number generator
            super().__init__(seed=seed)
        except TypeError:
            # Fallback for custom Model class
            super().__init__()
            
        # Ensure random attribute exists for Mesa visualization compatibility
        import random as random_module
        if not hasattr(self, 'random'):
            self.random = random_module.Random(seed)
        
        # Add space attribute for Mesa visualization compatibility
        # Use a simple MultiGrid since SolaraViz doesn't support NetworkGrid
        try:
            from mesa.space import MultiGrid
            # Create a simple 10x10 grid for visualization compatibility
            self.space = MultiGrid(10, 10, torus=True)
        except ImportError:
            # Fallback to a minimal space object if Mesa is not available
            self.space = None

        if seed is not None:
            random_module.seed(seed)
        self.seed = seed

        self.enable_marketing = (
            enable_marketing if enable_marketing is not None else settings.get("enable_marketing", False)
        )
        self.marketing_level = (
            marketing_level if marketing_level is not None else settings.get("marketing_level", "auto")
        )
        self.enable_player = (
            enable_player if enable_player is not None else settings.get("enable_player", False)
        )
        self.token_emission_rate = (
            token_emission_rate if token_emission_rate is not None else settings.get("token_emission_rate", 0.0)
        )
        self.token_burn_rate = (
            token_burn_rate if token_burn_rate is not None else settings.get("token_burn_rate", 0.0)
        )
        self.scenario_file = scenario_file
        self.scenario: list[dict] = []
        self._scenario_index = 0
        if self.scenario_file:
            self.scenario = self._load_scenario(self.scenario_file)
        self.events_file = events_file
        self.event_engine = EventEngine(events_file) if events_file else None

        self.export_csv = export_csv
        self.csv_filename = csv_filename
        self.use_parallel = use_parallel
        self.use_async = use_async
        self.max_workers = max_workers
        self.event_logging = event_logging
        self.event_log_filename = event_log_filename
        self.event_db_filename = event_db_filename
        self.stats_db_filename = stats_db_filename
        self.compress_events = compress_events
        self.checkpoint_interval = checkpoint_interval or 0
        self.checkpoint_path = checkpoint_path
        self.staking_interest_rate = (
            staking_interest_rate
            if staking_interest_rate is not None
            else settings.get("staking_interest_rate", 0.0)
        )
        self.slash_fraction = (
            slash_fraction
            if slash_fraction is not None
            else settings.get("slash_fraction", 0.0)
        )
        self.reputation_decay_rate = (
            reputation_decay_rate
            if reputation_decay_rate is not None
            else settings.get("reputation_decay_rate", 0.0)
        )
        self.market_shock_frequency = (
            market_shock_frequency
            if market_shock_frequency is not None
            else settings.get("market_shock_frequency", 0)
        )
        self.market_shock_schedule = {}
        if market_shock_file is not None:
            self.market_shock_schedule = self._load_market_shocks(market_shock_file)
        self.adaptive_learning_rate = (
            adaptive_learning_rate
            if adaptive_learning_rate is not None
            else settings.get("adaptive_learning_rate", DEFAULT_ADAPTIVE_LEARNING_RATE)
        )
        self.adaptive_epsilon = (
            adaptive_epsilon
            if adaptive_epsilon is not None
            else settings.get("adaptive_epsilon", DEFAULT_ADAPTIVE_EPSILON)
        )
        from utils.governance_plugins import get_rule
        self.governance_rule_name = (
            governance_rule
            if governance_rule is not None
            else settings.get("governance_rule", "majority")
        )
        rule_cls = get_rule(self.governance_rule_name)
        if rule_cls is None:
            raise ValueError(f"Unknown governance rule: {self.governance_rule_name}")
        self.governance_rule = rule_cls()
        self.report_file = report_file

        # Use provided parameters or fall back to global settings
        self.num_developers = num_developers if num_developers is not None else settings["num_developers"]
        self.num_investors = num_investors if num_investors is not None else settings["num_investors"]
        self.num_traders = num_traders if num_traders is not None else settings.get("num_traders", 0)
        self.num_adaptive_investors = (
            num_adaptive_investors if num_adaptive_investors is not None else settings.get("num_adaptive_investors", 0)
        )
        self.num_delegators = num_delegators if num_delegators is not None else settings["num_delegators"]
        self.num_liquid_delegators = (
            num_liquid_delegators if num_liquid_delegators is not None else settings.get("num_liquid_delegators", 0)
        )
        self.num_proposal_creators = (
            num_proposal_creators if num_proposal_creators is not None else settings["num_proposal_creators"]
        )
        self.num_validators = num_validators if num_validators is not None else settings["num_validators"]
        self.num_service_providers = (
            num_service_providers if num_service_providers is not None else settings["num_service_providers"]
        )
        self.num_arbitrators = num_arbitrators if num_arbitrators is not None else settings["num_arbitrators"]
        self.num_regulators = num_regulators if num_regulators is not None else settings["num_regulators"]
        self.num_auditors = num_auditors if num_auditors is not None else settings.get("num_auditors", 0)
        self.num_bounty_hunters = (
            num_bounty_hunters if num_bounty_hunters is not None else settings.get("num_bounty_hunters", 0)
        )
        self.num_external_partners = (
            num_external_partners if num_external_partners is not None else settings["num_external_partners"]
        )
        self.num_passive_members = (
            num_passive_members if num_passive_members is not None else settings["num_passive_members"]
        )
        self.num_artists = num_artists if num_artists is not None else settings.get("num_artists", 0)
        self.num_collectors = num_collectors if num_collectors is not None else settings.get("num_collectors", 0)
        self.num_speculators = num_speculators if num_speculators is not None else settings.get("num_speculators", 0)

        self.comment_probability = (
            comment_probability if comment_probability is not None else settings["comment_probability"]
        )
        self.external_partner_interact_probability = (
            external_partner_interact_probability
            if external_partner_interact_probability is not None
            else settings["external_partner_interact_probability"]
        )
        self.violation_probability = (
            violation_probability if violation_probability is not None else settings["violation_probability"]
        )
        self.reputation_penalty = (
            reputation_penalty if reputation_penalty is not None else settings["reputation_penalty"]
        )

        if self.event_logging or self.event_db_filename:
            if self.event_db_filename:
                from utils import DBEventLogger

                self.event_logger = DBEventLogger(
                    self.event_db_filename,
                    compress=self.compress_events,
                )
            else:
                from utils import EventLogger

                self.event_logger = EventLogger(
                    self.event_log_filename,
                    compress=self.compress_events,
                )
        else:
            self.event_logger = None

        self.dao = DAO(
            "MyDAO",
            violation_probability=self.violation_probability,
            reputation_penalty=self.reputation_penalty,
            comment_probability=self.comment_probability,
            external_partner_interact_probability=self.external_partner_interact_probability,
            staking_interest_rate=self.staking_interest_rate,
            slash_fraction=self.slash_fraction,
            reputation_decay_rate=self.reputation_decay_rate,
            event_logger=self.event_logger,
        )
        self.marketplace = NFTMarketplace(self.dao.event_bus)
        # expose the marketplace on the DAO so agents using ``self.model`` can
        # access it
        self.dao.marketplace = self.marketplace
        
        # Initialize treasury with substantial funding for project support
        initial_treasury_funding = INITIAL_TREASURY_FUNDING  # Increased from 1000 to support multiple projects
        self.dao.treasury.deposit("DAO_TOKEN", initial_treasury_funding, step=self.dao.current_step)
        
        if self.enable_marketing:
            # Additional marketing budget on top of base funding
            self.dao.treasury.deposit("DAO_TOKEN", MARKETING_BUDGET_BOOST, step=self.dao.current_step)
        self.reputation_tracker = ReputationTracker(self.dao)
        if self.market_shock_schedule:
            from data_structures.market_shock import MarketShock
            for step, sev in self.market_shock_schedule.items():
                self.dao.market_shocks.append(MarketShock(step, sev))
        self.current_shock = 0.0
        self.dao.current_shock = 0.0
        self.datacollector = SimpleDataCollector(
            self.dao, centrality_interval=centrality_interval
        )
        
        # Agent management
        self.agent_manager = AgentManager(self)
        self.stats_writer = (
            SQLiteDataCollector(self.stats_db_filename)
            if self.stats_db_filename
            else None
        )
        if self.use_async:
            self.schedule = AsyncActivation(self.dao)
        elif self.use_parallel:
            self.schedule = ParallelActivation(self.dao, workers=self.max_workers)
        else:
            self.schedule = RandomActivation(self.dao)

        agent_map = {
            Developer: {
                "count": self.num_developers,
                "params": {"tokens": DEVELOPER_TOKENS, "reputation": DEFAULT_AGENT_REPUTATION, "skillset": ["Python", "JavaScript"]},
            },
            Investor: {
                "count": self.num_investors,
                "params": {"tokens": INVESTOR_TOKENS, "reputation": DEFAULT_AGENT_REPUTATION, "investment_budget": INVESTOR_BUDGET},
            },
            Trader: {"count": self.num_traders, "params": {"tokens": TRADER_TOKENS, "reputation": DEFAULT_AGENT_REPUTATION}},
            AdaptiveInvestor: {
                "count": self.num_adaptive_investors,
                "params": {
                    "tokens": ADAPTIVE_INVESTOR_TOKENS,
                    "reputation": DEFAULT_AGENT_REPUTATION,
                    "investment_budget": ADAPTIVE_INVESTOR_BUDGET,
                    "learning_rate": self.adaptive_learning_rate,
                    "epsilon": self.adaptive_epsilon,
                },
            },
            Delegator: {
                "count": self.num_delegators,
                "params": {"tokens": 100, "reputation": 0, "delegation_budget": 200},
            },
            LiquidDelegator: {
                "count": self.num_liquid_delegators,
                "params": {"tokens": 100, "reputation": 0, "delegation_budget": 200},
            },
            ProposalCreator: {
                "count": self.num_proposal_creators,
                "params": {"tokens": 100, "reputation": 0},
            },
            Validator: {
                "count": self.num_validators,
                "params": {"tokens": 100, "reputation": 0},
            },
            ServiceProvider: {
                "count": self.num_service_providers,
                "params": {"tokens": 100, "reputation": 0, "service_budget": 200},
            },
            Arbitrator: {
                "count": self.num_arbitrators,
                "params": {"tokens": 100, "reputation": 0, "arbitration_capacity": 3},
            },
            Regulator: {"count": self.num_regulators, "params": {"tokens": 100, "reputation": 0}},
            Auditor: {"count": self.num_auditors, "params": {"tokens": 100, "reputation": 0}},
            BountyHunter: {
                "count": self.num_bounty_hunters,
                "params": {"tokens": 100, "reputation": 10},
            },
            ExternalPartner: {
                "count": self.num_external_partners,
                "params": {"tokens": 100, "reputation": 0, "voting_strategy": None},
            },
            Artist: {"count": self.num_artists, "params": {"tokens": 100, "reputation": 0}},
            Collector: {"count": self.num_collectors, "params": {"tokens": 100, "reputation": 0}},
            Speculator: {"count": self.num_speculators, "params": {"tokens": 100, "reputation": 0}},
            PassiveMember: {"count": self.num_passive_members, "params": {"tokens": 100, "reputation": 0}},
        }

        for cls, spec in agent_map.items():
            base = spec.get("params", {})
            for i in range(spec.get("count", 0)):
                params = {
                    "unique_id": f"{cls.__name__}_{i}",
                    "model": self,
                    "tokens": base.get("tokens", 100),
                    "reputation": base.get("reputation", 0),
                    "location": generate_random_location(),
                }
                extra = {k: v for k, v in base.items() if k not in {"tokens", "reputation"}}
                params.update(extra)
                agent = cls(**params)
                self.dao.add_member(agent)
                
                # Emit event for visualization
                if hasattr(self.dao, 'event_bus') and self.dao.event_bus:
                    self.dao.event_bus.publish(
                        'agent_created',
                        step=self.dao.current_step,
                        agent_id=agent.unique_id,
                        agent_type=cls.__name__,
                        tokens=agent.tokens,
                        reputation=agent.reputation,
                        location=getattr(agent, 'location', 'Unknown')
                    )

        for agent in self.dao.members:
            self.schedule.add(agent)
            # Add agent to the space for visualization
            if self.space is not None:
                # Place agents randomly on the grid
                import random
                x = random.randrange(self.space.width)
                y = random.randrange(self.space.height)
                self.space.place_agent(agent, (x, y))

        self.player = None
        if self.enable_player:
            from agents import PlayerAgent
            self.player = PlayerAgent(
                "Player",
                model=self,
                tokens=PLAYER_TOKENS,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(self.player)
            self.schedule.add(self.player)
            # Add player to the space for visualization
            if self.space is not None:
                # Place player randomly on the grid
                import random
                x = random.randrange(self.space.width)
                y = random.randrange(self.space.height)
                self.space.place_agent(self.player, (x, y))

    def step(self):
        self.current_shock = 0.0
        self.dao.current_shock = 0.0
        if self.schedule.steps in self.market_shock_schedule:
            severity = self.market_shock_schedule.pop(self.schedule.steps)
            self.trigger_market_shock(severity)
        elif self.market_shock_frequency and self.schedule.steps % self.market_shock_frequency == 0:
            self.trigger_market_shock()
        # Update token prices each tick to simulate a simple market.
        self.dao.treasury.update_prices()
        if self.token_emission_rate:
            self.dao.treasury.mint_tokens(
                "DAO_TOKEN", self.token_emission_rate, step=self.schedule.steps
            )
        if self.token_burn_rate:
            self.dao.treasury.burn_tokens(
                "DAO_TOKEN", self.token_burn_rate, step=self.schedule.steps
            )
        self.dao.apply_staking_interest()
        self.expire_proposals()
        self.complete_projects()
        self.resolve_disputes()
        self.distribute_revenue()
        self.execute_token_buyback()
        if self.enable_marketing:
            self.run_marketing_campaign()
        self.conduct_regular_meeting()
        self.add_new_agents()
        self.remove_agents()

        for member in self.dao.members:
            member._active = False

        if self.event_engine:
            self.event_engine.trigger_events(self.schedule.steps, self)

        # Execute all agent steps via the scheduler
        self.schedule.step()
        if hasattr(self, "reputation_tracker"):
            self.reputation_tracker.decay_reputation()
        self.dao.apply_reputation_decay()
        # Keep DAO time in sync with the scheduler
        self.dao.increment_step()
        self.datacollector.collect(self)
        self._check_objectives()
        if self.stats_writer:
            self.stats_writer.write_row(self.datacollector.model_vars[-1])
        if hasattr(self.dao, "event_bus"):
            self.dao.event_bus.publish(
                "step_end",
                step=self.schedule.steps,
                num_members=len(self.dao.members),
                token_price=self.dao.treasury.get_token_price("DAO_TOKEN"),
                recent_proposals=[p.title for p in self.dao.proposals[-5:]],
                price_history=self.datacollector.price_history,
                gini_coefficient=self.datacollector.gini_history[-1],
                gini_history=self.datacollector.gini_history,
                reputation_gini=self.datacollector.reputation_gini_history[-1],
                reputation_gini_history=self.datacollector.reputation_gini_history,
                delegation_centrality=self.datacollector.delegation_centrality[-1],
                top_influential=self.datacollector.influence_ranking_history[-1][:5],
                top_members=self.datacollector.token_ranking_history[-1][:5],
                token_rank_history=self.datacollector.token_ranking_history,
                influence_rank_history=self.datacollector.influence_ranking_history,
                achievements=self.datacollector.achievements,
                campaign_tokens_spent=self.datacollector.model_vars[-1].get("campaign_tokens_spent", 0),
                campaign_members_gained=self.datacollector.model_vars[-1].get("campaign_members_gained", 0),
                campaign_price_impact=self.datacollector.model_vars[-1].get("campaign_price_impact", 0.0),
            )
            self.dao.event_bus.publish(
                "network_update",
                step=self.schedule.steps,
                **compute_network_data(self.dao),
                centrality=self.datacollector.delegation_centrality[-1],
            )

    def expire_proposals(self):
        current_time = (
            self.schedule.steps
        )  # Assuming you have added schedule to the DAOSimulation class
        for proposal in self.dao.proposals:
            if (
                proposal.status == "open"
                and current_time > proposal.creation_time + proposal.voting_period
            ):
                approved = self.governance_rule.approve(proposal, self.dao)
                proposal.status = "approved" if approved else "rejected"
                if approved:
                    proposal.creator.reputation += 5
                    self.process_approved_proposal(proposal)

    def process_approved_proposal(self, proposal):
        """Execute actions based on the proposal subtype."""
        if isinstance(proposal, FundingProposal) and proposal.project:
            # Ensure treasury maintains minimum reserves
            treasury_balance = self.dao.treasury.get_token_balance("DAO_TOKEN")
            min_reserve = MIN_TREASURY_RESERVE  # Minimum treasury balance to maintain
            max_funding = min(proposal.funding_goal, max(0, treasury_balance - min_reserve))
            
            locked = self.dao.treasury.lock_tokens(
                "DAO_TOKEN", max_funding, step=self.schedule.steps
            )
            proposal.project.current_funding = locked
            proposal.project.funding_locked = locked == proposal.funding_goal
            if locked > 0:  # Only add project if it received some funding
                self.dao.add_project(proposal.project)
                if self.dao.event_bus:
                    self.dao.event_bus.publish(
                        "project_funded",
                        step=self.schedule.steps,
                        project=proposal.project.title,
                        amount=locked,
                        requested=proposal.funding_goal,
                    )
        elif isinstance(proposal, GovernanceProposal):
            try:
                from settings import update_settings

                update_settings(**{proposal.setting: proposal.value})
            except KeyError:
                pass
        elif isinstance(proposal, MembershipProposal):
            self.dao.add_member(proposal.new_member)
            self.schedule.add(proposal.new_member)
            # Add new member to the space for visualization
            if self.space is not None:
                # Place new member randomly on the grid
                import random
                x = random.randrange(self.space.width)
                y = random.randrange(self.space.height)
                self.space.place_agent(proposal.new_member, (x, y))
        elif isinstance(proposal, BountyProposal):
            locked = self.dao.treasury.lock_tokens(
                "DAO_TOKEN", proposal.reward, step=self.schedule.steps
            )
            if locked == proposal.reward:
                proposal.reward_locked = True
                if self.dao.event_bus:
                    self.dao.event_bus.publish(
                        "bounty_funded",
                        step=self.schedule.steps,
                        proposal=proposal.title,
                        reward=proposal.reward,
                    )
        elif isinstance(proposal, QuadraticFundingProposal) and proposal.project:
            total = proposal.current_funding
            match = (sum(math.sqrt(c) for c in proposal.contributions.values()) ** 2) - total
            match = max(0, match)
            
            # Respect treasury reserves for quadratic funding matching
            treasury_balance = self.dao.treasury.get_token_balance("DAO_TOKEN")
            min_reserve = MIN_TREASURY_RESERVE  # Same minimum reserve as regular funding
            available_for_matching = max(0, treasury_balance - min_reserve)
            match = min(match, available_for_matching)
            
            if match > 0:
                self.dao.treasury.withdraw("DAO_TOKEN", match, step=self.schedule.steps)
                if self.dao.event_bus:
                    self.dao.event_bus.publish(
                        "grant_matched",
                        step=self.schedule.steps,
                        proposal=proposal.title,
                        amount=match,
                    )
            proposal.project.current_funding += total + match
            self.dao.add_project(proposal.project)
            proposal.current_funding = 0
            if self.dao.event_bus:
                self.dao.event_bus.publish(
                    "grant_distributed",
                    step=self.schedule.steps,
                    proposal=proposal.title,
                    project=proposal.project.title,
                    amount=total + match,
                )

    def complete_projects(self):
        current_time = (
            self.schedule.steps
        )  # Assuming you have added schedule to the DAOSimulation class
        for project in self.dao.projects:
            if (
                project.status == "open"
                and current_time >= project.start_time + project.duration
            ):
                project.status = "completed"
                reward_pool = project.current_funding
                if reward_pool > 0:
                    for member in project.work_done:
                        share = project.member_share(member)
                        reward = reward_pool * share
                        if reward:
                            member.tokens += reward
                    self.dao.treasury.withdraw_locked(
                        "DAO_TOKEN", reward_pool, step=self.schedule.steps
                    )
                    project.current_funding = 0
                    project.funding_locked = False
                if self.dao.event_bus:
                    self.dao.event_bus.publish(
                        "project_completed",
                        step=self.schedule.steps,
                        project=project.title,
                        reward_pool=reward_pool,
                    )

    def resolve_disputes(self):
        arbitrators = self.agent_manager.get_agents_by_type('Arbitrator')
        for dispute in self.dao.disputes:
            if not dispute.resolved and arbitrators:
                arbitrator = random.choice(arbitrators)
                arbitrator.arbitrate(dispute)
                arbitrator.resolve_dispute(dispute)

    def distribute_revenue(self):
        total_revenue = self.dao.treasury.get_revenue_amount()
        if total_revenue == 0:
            return
        self.dao.distribute_revenue(total_revenue, "DAO_TOKEN")

    def calculate_revenue_share(self, member, total_revenue, total_staked_tokens):
        # Calculate revenue share for each member based on the ratio of their staked tokens
        share_percentage = member.staked_tokens / total_staked_tokens
        return total_revenue * share_percentage

    def execute_token_buyback(self):
        buyback_amount = self.calculate_buyback_amount()
        if buyback_amount > 0:
            self.dao.buyback_tokens(buyback_amount)

    def calculate_buyback_amount(self):
        # Buy back tokens when treasury is flush and the price drops below 1.
        dao_price = self.dao.treasury.get_token_price("DAO_TOKEN")
        if self.dao.treasury.funds > BUYBACK_FUND_THRESHOLD and dao_price < BUYBACK_PRICE_THRESHOLD:
            return self.dao.treasury.funds * BUYBACK_PERCENTAGE
        return 0

    def _load_market_shocks(self, path: str) -> dict[int, float]:
        """Load a schedule of market shocks from a JSON or YAML file."""
        import json
        data = []
        if path.endswith((".yaml", ".yml")):
            try:
                import yaml  # type: ignore
            except Exception as e:  # pragma: no cover - optional dep
                raise ImportError("PyYAML is required for YAML configs") from e
            with open(path) as f:
                data = yaml.safe_load(f) or []
        else:
            with open(path) as f:
                data = json.load(f)
        schedule: dict[int, float] = {}
        for item in data:
            try:
                step = int(item.get("step", 0))
                sev = float(item.get("severity", 0.0))
            except (ValueError, TypeError) as e:
                from utils.logging_config import get_logger
                logger = get_logger(__name__)
                logger.warning(f"Invalid shock data item {item}: {e}")
                continue
            schedule[step] = sev
        return schedule

    def _check_objectives(self) -> None:
        if not self.scenario or self._scenario_index >= len(self.scenario):
            return
        metrics = {
            "step": lambda: self.schedule.steps,
            "proposal_count": lambda: len(self.dao.proposals),
            "approved_proposals": lambda: sum(
                1 for p in self.dao.proposals if p.status == "approved"
            ),
            "member_count": lambda: len(self.dao.members),
            "project_count": lambda: len(self.dao.projects),
            "token_price": lambda: self.dao.treasury.get_token_price("DAO_TOKEN"),
            "guild_count": lambda: len(getattr(self.dao, "guilds", [])),
        }
        changed = False
        while self._scenario_index < len(self.scenario):
            obj = self.scenario[self._scenario_index]
            func = metrics.get(obj["metric"], lambda: 0)
            try:
                val = func()
            except Exception:
                break
            if val >= obj["threshold"]:
                obj["completed"] = True
                self._scenario_index += 1
                changed = True
            else:
                break
        if changed and self.dao.event_bus:
            self.dao.event_bus.publish(
                "scenario_progress",
                step=self.schedule.steps,
                completed=[o["description"] for o in self.scenario if o["completed"]],
                remaining=[o["description"] for o in self.scenario if not o["completed"]],
            )

    def _load_scenario(self, path: str) -> list[dict]:
        """Load tutorial objectives from JSON or YAML."""
        import json
        if path.endswith((".yaml", ".yml")):
            try:
                import yaml  # type: ignore
            except Exception as e:  # pragma: no cover - optional dep
                raise ImportError("PyYAML is required for YAML scenarios") from e
            with open(path) as f:
                data = yaml.safe_load(f) or []
        else:
            with open(path) as f:
                data = json.load(f)
        if isinstance(data, dict):
            steps = data.get("steps", [])
        else:
            steps = data
        scenario = []
        for step in steps:
            try:
                scenario.append(
                    {
                        "description": str(step.get("description", "")),
                        "metric": str(step.get("metric", step.get("type", ""))),
                        "threshold": float(step.get("threshold", 1)),
                        "completed": False,
                    }
                )
            except (ValueError, TypeError, AttributeError) as e:
                from utils.logging_config import get_logger
                logger = get_logger(__name__)
                logger.warning(f"Invalid scenario step {step}: {e}")
                continue
        return scenario

    def trigger_market_shock(self, severity: float | None = None) -> None:
        """Apply a sudden price change and record the severity."""
        price = self.dao.treasury.get_token_price("DAO_TOKEN")
        if severity is None:
            factor = 1 + random.uniform(-MARKET_SHOCK_RANGE, MARKET_SHOCK_RANGE)
            severity = factor - 1
        else:
            factor = 1 + severity
        new_price = max(price * factor, MIN_TOKEN_PRICE)
        self.dao.treasury.update_token_price("DAO_TOKEN", new_price)
        self.current_shock = severity
        self.dao.current_shock = severity
        from data_structures.market_shock import MarketShock
        shock = MarketShock(self.schedule.steps, severity)
        self.dao.market_shocks.append(shock)
        if self.dao.event_bus:
            self.dao.event_bus.publish(
                "market_shock",
                step=self.schedule.steps,
                severity=severity,
                new_price=new_price,
            )

    # we will implement a regular meeting that takes
    # place every 30 steps. The meeting will involve a
    # discussion where agents can share their opinions and vote
    # on specific topics. For simplicity, we will randomly generate a
    # topic and let each agent vote "yes" or "no"
    # based on a simple decision rule.

    def conduct_regular_meeting(self):
        if self.schedule.steps % 30 == 0:  # Every 30 steps
            topic = self.generate_random_topic()
            votes = self.collect_agents_votes(topic)
            self.process_meeting_votes(votes)

    def generate_random_topic(self):
        topics = ["Topic A", "Topic B", "Topic C"]
        return random.choice(topics)

    def collect_agents_votes(self, topic):
        votes = {"yes": 0, "no": 0}
        for agent in self.dao.members:
            if agent.decide_vote(topic) == "yes":
                votes["yes"] += 1
            else:
                votes["no"] += 1
        return votes

    def process_meeting_votes(self, votes):
        if votes["yes"] > votes["no"]:
            self.dao.event_bus.publish(
                "meeting_result",
                step=self.schedule.steps,
                result="yes",
            )
        else:
            self.dao.event_bus.publish(
                "meeting_result",
                step=self.schedule.steps,
                result="no",
            )

    def add_new_agents(self):
        agent_classes = [
            Developer,
            Investor,
            Trader,
            RLTrader,
            Delegator,
            ProposalCreator,
            Validator,
            ServiceProvider,
            Arbitrator,
            Regulator,
            ExternalPartner,
            PassiveMember,
        ]
        self.agent_manager.add_new_members()

    def create_new_agent(self, agent_class, step):
        agent_id = f"{agent_class.__name__}_{step}"
        agent_params = {
            "unique_id": agent_id,
            "model": self.dao,
            "tokens": 100,
            # Give new agents a starting reputation so they can satisfy the
            # reputation threshold in ``add_new_agents``.
            "reputation": random.randint(0, 50),
            "location": generate_random_location(),
        }

        if agent_class == Developer:
            agent_params.update({"skillset": ["Python", "JavaScript"]})
        elif agent_class == Investor:
            agent_params.update({"investment_budget": 500})
        elif agent_class == Delegator:
            agent_params.update({"delegation_budget": 200})
        elif agent_class == ServiceProvider:
            agent_params.update({"service_budget": 200})
        elif agent_class == Arbitrator:
            agent_params.update({"arbitration_capacity": 3})
        elif agent_class == Trader:
            agent_params.update({"voting_strategy": None})
        elif agent_class == RLTrader:
            agent_params.update({
                "learning_rate": self.adaptive_learning_rate,
                "epsilon": self.adaptive_epsilon,
            })
        elif agent_class == ExternalPartner:
            agent_params.update({"voting_strategy": None})

        return agent_class(**agent_params)

    def remove_agents(self):
        agents_to_remove = []
        for agent in self.dao.members:
            # Only cull members whose reputation dropped below zero.
            if agent.reputation < 0:
                agents_to_remove.append(agent)
        for agent in agents_to_remove:
            self.dao.remove_member(agent)
            self.schedule.remove(agent)
            self.agent_manager.invalidate_cache()
            # Remove agent from the space for visualization
            if self.space is not None:
                self.space.remove_agent(agent)

    def run_marketing_campaign(self):
        from data_structures.marketing_events import (
            DemandBoostCampaign,
            RecruitmentCampaign,
            SocialMediaCampaign,
            ReferralBonusCampaign,
        )

        if self.schedule.steps % 20 != 0:
            return

        balance = self.dao.treasury.get_token_balance("DAO_TOKEN")
        level = self.marketing_level

        if level == "low":
            camp_cls = SocialMediaCampaign
        elif level == "medium":
            camp_cls = DemandBoostCampaign if balance >= 20 else SocialMediaCampaign
        elif level == "high":
            if balance >= 60:
                camp_cls = random.choice([RecruitmentCampaign, ReferralBonusCampaign])
            elif balance >= 20:
                camp_cls = DemandBoostCampaign
            else:
                camp_cls = SocialMediaCampaign
        else:  # auto
            if balance < 50:
                camp_cls = SocialMediaCampaign
            elif balance < 150:
                camp_cls = DemandBoostCampaign
            elif balance < 300:
                camp_cls = RecruitmentCampaign
            else:
                camp_cls = random.choice([
                    RecruitmentCampaign,
                    ReferralBonusCampaign,
                    DemandBoostCampaign,
                ])

        camp = camp_cls(self.dao)
        camp.execute(self)

    def save_state(self, filename: str):
        data = {
            "schedule_steps": self.schedule.steps,
            "dao": self.dao.to_dict(),
            "collector": self.datacollector.model_vars,
        }
        with open(filename, "w") as f:
            json.dump(data, f)

    @classmethod
    def load_state(cls, filename: str, *, resume: bool = False, **kwargs):
        """Recreate a simulation from a saved state."""

        with open(filename) as f:
            data = json.load(f)
        sim = cls(**kwargs)
        sim.schedule.steps = data.get("schedule_steps", 0)
        sim.dao = DAO.from_dict(data["dao"])
        sim.marketplace = NFTMarketplace(sim.dao.event_bus)
        sim.dao.marketplace = sim.marketplace
        sim.datacollector.model_vars = data.get("collector", [])
        sim.schedule.agents = []
        for member in sim.dao.members:
            sim.schedule.add(member)
            # Add member to the space for visualization
            if sim.space is not None:
                # Place member randomly on the grid
                import random
                x = random.randrange(sim.space.width)
                y = random.randrange(sim.space.height)
                sim.space.place_agent(member, (x, y))
        return sim

    def run(self, steps):
        """Run the simulation for the given number of steps."""
        import os

        for _ in range(steps):
            self.step()
            if self.checkpoint_interval and self.checkpoint_path:
                if self.schedule.steps % self.checkpoint_interval == 0:
                    cp = os.path.join(
                        self.checkpoint_path, f"checkpoint_{self.schedule.steps}.json"
                    )
                    self.save_state(cp)
        self.finalize()

    def finalize(self) -> None:
        """Write outputs and close resources."""
        csv_arg = None
        if self.export_csv:
            exporter = CSVDataCollector(self.csv_filename)
            exporter.write(self.datacollector.model_vars)
            csv_arg = self.csv_filename
        try:
            generate_report(self, csv_file=csv_arg, html_file=self.report_file)
        except ImportError as e:
            from utils.logging_config import get_logger
            logger = get_logger(__name__)
            logger.warning(f"Report generation dependencies not available: {e}")
        except (OSError, IOError) as e:
            from utils.logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(f"Failed to write report file: {e}")
        except Exception as e:
            from utils.logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(f"Unexpected error generating report: {e}")
        if self.stats_writer:
            self.stats_writer.close()
        if self.event_logging and self.event_logger:
            self.event_logger.close()
        if hasattr(self.dao, "event_bus"):
            self.dao.event_bus.close()

    @property
    def steps(self):
        """Mesa visualization compatibility property."""
        return self.schedule.steps
        
    @steps.setter
    def steps(self, value):
        """Allow Mesa to set the steps value."""
        # Mesa Model.__init__ sets this, but we delegate to schedule
        pass
        
    def __getattr__(self, name):
        """
        Automatically delegate missing attributes to the DAO object.
        This provides backward compatibility for agents expecting to access DAO 
        attributes/methods directly on the model (e.g., self.model.treasury).
        """
        if hasattr(self.dao, name):
            return getattr(self.dao, name)
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
