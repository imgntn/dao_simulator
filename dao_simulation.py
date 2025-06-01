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

    def __init__(self):
        self.model_vars = []

    def collect(self, model):
        self.model_vars.append(
            {
                "step": model.schedule.steps,
                "num_members": len(model.dao.members),
                "num_proposals": len(model.dao.proposals),
                "num_projects": len(model.dao.projects),
            }
        )


class CSVDataCollector:
    """Write collected model variables to a CSV file."""

    def __init__(self, filename):
        self.filename = filename
        self.headers = ["step", "num_members", "num_proposals", "num_projects"]

    def write(self, model_vars):
        import csv

        with open(self.filename, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.headers)
            writer.writeheader()
            for row in model_vars:
                writer.writerow({h: row.get(h) for h in self.headers})


from data_structures.dao import DAO
from utils import EventLogger
from agents import (
    Arbitrator,
    Delegator,
    Developer,
    ExternalPartner,
    Investor,
    PassiveMember,
    ProposalCreator,
    Regulator,
    ServiceProvider,
    Validator,
)
from utils.locations import generate_random_location

# from utils.voting_strategies import majority_vote
import random
from settings import settings


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
        num_developers: int | None = None,
        num_investors: int | None = None,
        num_delegators: int | None = None,
        num_proposal_creators: int | None = None,
        num_validators: int | None = None,
        num_service_providers: int | None = None,
        num_arbitrators: int | None = None,
        num_regulators: int | None = None,
        num_external_partners: int | None = None,
        num_passive_members: int | None = None,
        comment_probability: float | None = None,
        external_partner_interact_probability: float | None = None,
        violation_probability: float | None = None,
        reputation_penalty: int | None = None,
        **_: object,
    ) -> None:
        super().__init__()

        self.export_csv = export_csv
        self.csv_filename = csv_filename
        self.use_parallel = use_parallel
        self.use_async = use_async
        self.max_workers = max_workers
        self.event_logging = event_logging
        self.event_log_filename = event_log_filename

        # Use provided parameters or fall back to global settings
        self.num_developers = num_developers if num_developers is not None else settings["num_developers"]
        self.num_investors = num_investors if num_investors is not None else settings["num_investors"]
        self.num_delegators = num_delegators if num_delegators is not None else settings["num_delegators"]
        self.num_proposal_creators = (
            num_proposal_creators if num_proposal_creators is not None else settings["num_proposal_creators"]
        )
        self.num_validators = num_validators if num_validators is not None else settings["num_validators"]
        self.num_service_providers = (
            num_service_providers if num_service_providers is not None else settings["num_service_providers"]
        )
        self.num_arbitrators = num_arbitrators if num_arbitrators is not None else settings["num_arbitrators"]
        self.num_regulators = num_regulators if num_regulators is not None else settings["num_regulators"]
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

        if self.event_logging:
            self.event_logger = EventLogger(self.event_log_filename)
        else:
            self.event_logger = None

        self.dao = DAO(
            "MyDAO",
            violation_probability=self.violation_probability,
            reputation_penalty=self.reputation_penalty,
            comment_probability=self.comment_probability,
            external_partner_interact_probability=self.external_partner_interact_probability,
            event_logger=self.event_logger,
        )
        self.datacollector = SimpleDataCollector()
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
        # Update token prices each tick to simulate a simple market.
        self.dao.treasury.update_prices()
        self.expire_proposals()
        self.complete_projects()
        self.resolve_disputes()
        self.distribute_revenue()
        self.execute_token_buyback()
        self.conduct_regular_meeting()
        self.add_new_agents()
        self.remove_agents()
        ## TODO: ask for more complex examples of 1-3

        # Execute all agent steps via the scheduler
        self.schedule.step()
        # Keep DAO time in sync with the scheduler
        self.dao.current_step += 1
        self.datacollector.collect(self)

    def expire_proposals(self):
        current_time = (
            self.schedule.steps
        )  # Assuming you have added schedule to the DAOSimulation class
        for proposal in self.dao.proposals:
            if (
                proposal.status == "open"
                and current_time > proposal.creation_time + proposal.voting_period
            ):
                proposal.status = "expired"
                # Process the results based on the votes
                if proposal.votes_for > proposal.votes_against:
                    proposal.status = "approved"
                    # Additional actions based on the proposal type can be executed here
                    proposal.creator.reputation += 5
                else:
                    proposal.status = "rejected"

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
                # Release any locked funds, if applicable
                # Distribute rewards to the involved parties, such as developers, investors, etc.
                # You may need to implement additional methods or logic in the respective agent classes
                # to handle the reward distribution

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

        total_staked_tokens = sum(member.tokens for member in self.dao.members)
        if total_staked_tokens == 0:
            return

        for member in self.dao.members:
            revenue_share = self.calculate_revenue_share(
                member, total_revenue, total_staked_tokens
            )
            member.receive_revenue_share(revenue_share)

    def calculate_revenue_share(self, member, total_revenue, total_staked_tokens):
        # Calculate revenue share for each member based on the ratio of their staked tokens
        share_percentage = member.tokens / total_staked_tokens
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
        elif agent_class == ExternalPartner:
            agent_params.update({"voting_strategy": None})

        return agent_class(**agent_params)

    def remove_agents(self):
        agents_to_remove = []
        for agent in self.dao.members:
            if agent.reputation < 10:  # Remove if reputation is below 10
                agents_to_remove.append(agent)
        for agent in agents_to_remove:
            self.dao.remove_member(agent)
            self.schedule.remove(agent)

    def run(self, steps):
        """Run the simulation for the given number of steps."""
        for _ in range(steps):
            self.step()

        if self.export_csv:
            exporter = CSVDataCollector(self.csv_filename)
            exporter.write(self.datacollector.model_vars)
        if self.event_logging and self.event_logger:
            self.event_logger.close()
