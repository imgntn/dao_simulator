# File: dao_simulation/dao_simulation.py
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

    def __init__(self, dao=None):
        self.model_vars = []
        self.event_counts = {}
        self.price_history: list[float] = []
        self.gini_history: list[float] = []
        self.delegation_centrality: list[dict[str, float]] = []
        if dao is not None:
            dao.event_bus.subscribe("*", self._handle_event)

    def _handle_event(self, event: str, **_):
        self.event_counts[event] = self.event_counts.get(event, 0) + 1

    def collect(self, model):
        members = model.dao.members
        avg_rep = sum(m.reputation for m in members) / len(members) if members else 0
        total_tokens = sum(m.tokens for m in members)
        gini_coeff = gini([m.tokens for m in members]) if members else 0.0
        price = model.dao.treasury.get_token_price("DAO_TOKEN")
        self.price_history.append(price)
        self.gini_history.append(gini_coeff)
        import networkx as nx
        G = nx.DiGraph()
        for m in members:
            rep = getattr(m, "representative", None)
            if rep is not None:
                G.add_edge(m.unique_id, rep.unique_id)
        centrality = nx.in_degree_centrality(G) if G.number_of_nodes() > 0 else {}
        self.delegation_centrality.append(centrality)
        row = {
            "step": model.schedule.steps,
            "num_members": len(members),
            "num_proposals": len(model.dao.proposals),
            "num_projects": len(model.dao.projects),
            "avg_reputation": avg_rep,
            "total_tokens": total_tokens,
            "gini_coefficient": gini_coeff,
            "event_count": sum(self.event_counts.values()),
            "dao_token_price": price,
        }
        try:
            from utils.metric_plugins import get_metrics

            for func in get_metrics().values():
                try:
                    extra = func(model)
                    if isinstance(extra, dict):
                        row.update(extra)
                except Exception:
                    pass
        except Exception:
            pass
        row["delegation_centrality"] = centrality
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
            "gini_coefficient",
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
            total_tokens REAL,
            gini_coefficient REAL,
            event_count INTEGER,
            dao_token_price REAL
        )"""
        )
        self.conn.commit()

    def write_row(self, row: dict) -> None:
        self.conn.execute(
            "INSERT INTO stats VALUES (?,?,?,?,?,?,?,?,?)",
            (
                row.get("step"),
                row.get("num_members"),
                row.get("num_proposals"),
                row.get("num_projects"),
                row.get("avg_reputation"),
                row.get("total_tokens"),
                row.get("gini_coefficient"),
                row.get("event_count"),
                row.get("dao_token_price"),
            ),
        )
        self.conn.commit()

    def close(self) -> None:
        if self.conn:
            self.conn.close()
            self.conn = None


from data_structures.dao import DAO
from data_structures import (
    FundingProposal,
    GovernanceProposal,
    MembershipProposal,
    BountyProposal,
    Project,
)
from utils import EventLogger
from utils import gini
from agents import (
    Arbitrator,
    Delegator,
    LiquidDelegator,
    Developer,
    ExternalPartner,
    Investor,
    AdaptiveInvestor,
    PassiveMember,
    ProposalCreator,
    Regulator,
    ServiceProvider,
    Auditor,
    Validator,
    BountyHunter,
    Trader,
)
from utils.locations import generate_random_location

# from utils.voting_strategies import majority_vote
import random
from settings import settings
import json
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
        report_file: str | None = None,
        seed: int | None = None,
        **_: object,
    ) -> None:
        super().__init__()

        if seed is not None:
            random.seed(seed)
        self.seed = seed

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
            else settings.get("adaptive_learning_rate", 0.1)
        )
        self.adaptive_epsilon = (
            adaptive_epsilon
            if adaptive_epsilon is not None
            else settings.get("adaptive_epsilon", 0.1)
        )
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
        self.num_passive_members = num_passive_members if num_passive_members is not None else settings["num_passive_members"]

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
        if self.market_shock_schedule:
            from data_structures.market_shock import MarketShock
            for step, sev in self.market_shock_schedule.items():
                self.dao.market_shocks.append(MarketShock(step, sev))
        self.current_shock = 0.0
        self.dao.current_shock = 0.0
        self.datacollector = SimpleDataCollector(self.dao)
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

        for i in range(self.num_developers):
            developer = Developer(
                unique_id=f"Developer_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                skillset=["Python", "JavaScript"],
            )
            self.dao.add_member(developer)

        for i in range(self.num_investors):
            investor = Investor(
                unique_id=f"Investor_{i}",
                model=self.dao,
                tokens=1000,
                reputation=0,
                location=generate_random_location(),
                investment_budget=500,
            )
            self.dao.add_member(investor)

        for i in range(self.num_traders):
            trader = Trader(
                unique_id=f"Trader_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(trader)

        for i in range(self.num_adaptive_investors):
            ainv = AdaptiveInvestor(
                unique_id=f"AdaptiveInvestor_{i}",
                model=self.dao,
                tokens=1000,
                reputation=0,
                location=generate_random_location(),
                investment_budget=500,
                learning_rate=self.adaptive_learning_rate,
                epsilon=self.adaptive_epsilon,
            )
            self.dao.add_member(ainv)

        for i in range(self.num_delegators):
            delegator = Delegator(
                unique_id=f"Delegator_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                delegation_budget=200,
            )
            self.dao.add_member(delegator)

        for i in range(self.num_liquid_delegators):
            ldel = LiquidDelegator(
                unique_id=f"LiquidDelegator_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                delegation_budget=200,
            )
            self.dao.add_member(ldel)

        for i in range(self.num_proposal_creators):
            proposal_creator = ProposalCreator(
                unique_id=f"ProposalCreator_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(proposal_creator)

        for i in range(self.num_validators):
            validator = Validator(
                unique_id=f"Validator_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(validator)

        for i in range(self.num_service_providers):
            service_provider = ServiceProvider(
                unique_id=f"ServiceProvider_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                service_budget=200,
            )
            self.dao.add_member(service_provider)

        for i in range(self.num_arbitrators):
            arbitrator = Arbitrator(
                unique_id=f"Arbitrator_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                arbitration_capacity=3,
            )
            self.dao.add_member(arbitrator)

        for i in range(self.num_regulators):
            regulator = Regulator(
                unique_id=f"Regulator_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(regulator)

        for i in range(self.num_auditors):
            auditor = Auditor(
                unique_id=f"Auditor_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(auditor)

        for i in range(self.num_bounty_hunters):
            hunter = BountyHunter(
                unique_id=f"BountyHunter_{i}",
                model=self.dao,
                tokens=100,
                reputation=10,
                location=generate_random_location(),
            )
            self.dao.add_member(hunter)

        for i in range(self.num_external_partners):
            external_partner = ExternalPartner(
                unique_id=f"ExternalPartner_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                voting_strategy=None,
            )
            self.dao.add_member(external_partner)

        for i in range(self.num_passive_members):
            passive_member = PassiveMember(
                unique_id=f"PassiveMember_{i}",
                model=self.dao,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(passive_member)

        for agent in self.dao.members:
            self.schedule.add(agent)

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
        self.dao.apply_staking_interest()
        self.expire_proposals()
        self.complete_projects()
        self.resolve_disputes()
        self.distribute_revenue()
        self.execute_token_buyback()
        self.conduct_regular_meeting()
        self.add_new_agents()
        self.remove_agents()

        for member in self.dao.members:
            member._active = False

        # Execute all agent steps via the scheduler
        self.schedule.step()
        self.dao.apply_reputation_decay()
        # Keep DAO time in sync with the scheduler
        self.dao.current_step += 1
        self.datacollector.collect(self)
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
                delegation_centrality=self.datacollector.delegation_centrality[-1],
                top_influential=sorted(
                    self.datacollector.delegation_centrality[-1].items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:5],
                top_members=[
                    (m.unique_id, m.tokens)
                    for m in sorted(
                        self.dao.members, key=lambda x: x.tokens, reverse=True
                    )[:5]
                ],
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
                if proposal.votes_for > proposal.votes_against:
                    proposal.status = "approved"
                    proposal.creator.reputation += 5
                    self.process_approved_proposal(proposal)
                else:
                    proposal.status = "rejected"

    def process_approved_proposal(self, proposal):
        """Execute actions based on the proposal subtype."""
        if isinstance(proposal, FundingProposal) and proposal.project:
            proposal.project.current_funding = proposal.funding_goal
            self.dao.add_project(proposal.project)
            self.dao.treasury.withdraw("DAO_TOKEN", proposal.funding_goal)
        elif isinstance(proposal, GovernanceProposal):
            try:
                from settings import update_settings

                update_settings(**{proposal.setting: proposal.value})
            except KeyError:
                pass
        elif isinstance(proposal, MembershipProposal):
            self.dao.add_member(proposal.new_member)
            self.schedule.add(proposal.new_member)
        elif isinstance(proposal, BountyProposal):
            locked = self.dao.treasury.lock_tokens("DAO_TOKEN", proposal.reward)
            if locked == proposal.reward:
                proposal.reward_locked = True
                if self.dao.event_bus:
                    self.dao.event_bus.publish(
                        "bounty_funded",
                        step=self.schedule.steps,
                        proposal=proposal.title,
                        reward=proposal.reward,
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
                    self.dao.treasury.withdraw("DAO_TOKEN", reward_pool)
                    project.current_funding = 0
                if self.dao.event_bus:
                    self.dao.event_bus.publish(
                        "project_completed",
                        step=self.schedule.steps,
                        project=project.title,
                        reward_pool=reward_pool,
                    )

    def resolve_disputes(self):
        arbitrators = [a for a in self.dao.members if isinstance(a, Arbitrator)]
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
        if self.dao.treasury.funds > 5000 and dao_price < 1:
            return self.dao.treasury.funds * 0.1
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
            except Exception:
                continue
            schedule[step] = sev
        return schedule

    def trigger_market_shock(self, severity: float | None = None) -> None:
        """Apply a sudden price change and record the severity."""
        price = self.dao.treasury.get_token_price("DAO_TOKEN")
        if severity is None:
            factor = 1 + random.uniform(-0.5, 0.5)
            severity = factor - 1
        else:
            factor = 1 + severity
        new_price = max(price * factor, 0.01)
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
            print("Majority voted yes on the topic.")
        else:
            print("Majority voted no on the topic.")

    def add_new_agents(self):
        agent_classes = [
            Developer,
            Investor,
            Trader,
            Delegator,
            ProposalCreator,
            Validator,
            ServiceProvider,
            Arbitrator,
            Regulator,
            ExternalPartner,
            PassiveMember,
        ]
        for _ in range(5):  # Add 5 new members every 50 steps
            if self.schedule.steps % 50 == 0:
                if self.dao.treasury.funds >= 100:  # Check if DAO has enough funds
                    agent_class = random.choice(agent_classes)
                    new_agent = self.create_new_agent(agent_class, self.schedule.steps)
                    if new_agent.reputation > 25:  # Add only if reputation is above 25
                        self.dao.add_member(new_agent)
                        self.schedule.add(new_agent)
                        self.dao.treasury.withdraw("DAO_TOKEN", 100)

    def create_new_agent(self, agent_class, step):
        agent_id = f"{agent_class.__name__}_{step}"
        agent_params = {
            "unique_id": agent_id,
            "model": self.dao,
            "tokens": 100,
            "reputation": 0,
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
            pass
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
        sim.datacollector.model_vars = data.get("collector", [])
        sim.schedule.agents = []
        for member in sim.dao.members:
            sim.schedule.add(member)
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

        csv_arg = None
        if self.export_csv:
            exporter = CSVDataCollector(self.csv_filename)
            exporter.write(self.datacollector.model_vars)
            csv_arg = self.csv_filename
        try:
            generate_report(self, csv_file=csv_arg, html_file=self.report_file)
        except Exception:
            pass
        if self.stats_writer:
            self.stats_writer.close()
        if self.event_logging and self.event_logger:
            self.event_logger.close()
        if hasattr(self.dao, "event_bus"):
            self.dao.event_bus.close()
