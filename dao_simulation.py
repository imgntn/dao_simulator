# File: dao_simulation/dao_simulation.py
from mesa import Model
from mesa.time import RandomActivation
from data_structures.dao import DAO
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
    def __init__(self, steps=None):
        super().__init__()

        self.dao = DAO("MyDAO")
        self.schedule = RandomActivation(self)
        self.steps = steps

        for i in range(settings["num_developers"]):
            developer = Developer(
                unique_id=f"Developer_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                skillset=["Python", "JavaScript"],
            )
            self.dao.add_member(developer)

        for i in range(settings["num_investors"]):
            investor = Investor(
                unique_id=f"Investor_{i}",
                model=self,
                tokens=1000,
                reputation=0,
                location=generate_random_location(),
                investment_budget=500,
            )
            self.dao.add_member(investor)

        for i in range(settings["num_delegators"]):
            delegator = Delegator(
                unique_id=f"Delegator_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                delegation_budget=200,
            )
            self.dao.add_member(delegator)

        for i in range(settings["num_proposal_creators"]):
            proposal_creator = ProposalCreator(
                unique_id=f"ProposalCreator_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(proposal_creator)

        for i in range(settings["num_validators"]):
            validator = Validator(
                unique_id=f"Validator_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(validator)

        for i in range(settings["num_service_providers"]):
            service_provider = ServiceProvider(
                unique_id=f"ServiceProvider_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                service_budget=200,
            )
            self.dao.add_member(service_provider)

        for i in range(settings["num_arbitrators"]):
            arbitrator = Arbitrator(
                unique_id=f"Arbitrator_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
                arbitration_capacity=3,
            )
            self.dao.add_member(arbitrator)

        for i in range(settings["num_regulators"]):
            regulator = Regulator(
                unique_id=f"Regulator_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(regulator)

        for i in range(settings["num_external_partners"]):
            external_partner = ExternalPartner(
                unique_id=f"ExternalPartner_{i}",
                model=self,
            )
            self.dao.add_member(external_partner)

        for i in range(settings["num_passive_members"]):
            passive_member = PassiveMember(
                unique_id=f"PassiveMember_{i}",
                model=self,
                tokens=100,
                reputation=0,
                location=generate_random_location(),
            )
            self.dao.add_member(passive_member)

        for agent in self.dao.members:
            self.schedule.add(agent)

    def step(self):
        self.expire_proposals()
        self.complete_projects()
        self.resolve_disputes()
        self.distribute_revenue()
        self.execute_token_buyback()
        self.conduct_regular_meeting()
        self.add_new_agents()
        self.remove_agents()
        ## TODO: ask for more complex examples of 1-3

        # Iterate over all agents in the DAO and call their step function
        for agent in self.dao.members:
            agent.step()

    def expire_proposals(self):
        current_time = (
            self.schedule.steps
        )  # Assuming you have added schedule to the DAOSimulation class
        for proposal in self.dao.proposals:
            if (
                proposal.status == "active"
                and current_time > proposal.creation_time + proposal.voting_period
            ):
                proposal.status = "expired"
                # Process the results based on the votes
                if proposal.votes_for > proposal.votes_against:
                    proposal.status = "approved"
                    # Additional actions based on the proposal type can be executed here
                else:
                    proposal.status = "rejected"

    def complete_projects(self):
        current_time = (
            self.schedule.steps
        )  # Assuming you have added schedule to the DAOSimulation class
        for project in self.dao.projects:
            if (
                project.status == "ongoing"
                and current_time >= project.start_time + project.duration
            ):
                project.status = "completed"
                # Release any locked funds, if applicable
                # Distribute rewards to the involved parties, such as developers, investors, etc.
                # You may need to implement additional methods or logic in the respective agent classes
                # to handle the reward distribution

    def resolve_disputes(self):
        for dispute in self.dao.disputes:
            if dispute.status == "unresolved":
                arbitrator = dispute.arbitrator
                resolution = arbitrator.resolve_dispute(dispute)
                dispute.status = "resolved"

                # Update involved parties' reputations and take any necessary actions based on the dispute's outcome
                # You may need to implement additional methods or logic in the respective agent classes
                # to handle the updates and actions

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
            self.dao.buy_back_tokens(buyback_amount)

    def calculate_buyback_amount(self):
        # You can define your own buyback conditions here.
        # For example, if the DAO's treasury has more than 5000 tokens, buy back 10% of them.
        if self.dao.treasury.funds > 5000:
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
        for agent in self.dao.members.values():
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
                    agent_class = random.choice(
                        agent_classes
                    )  # Select a random agent class
                    new_agent = self.create_new_agent(agent_class, self.schedule.steps)
                    if new_agent.reputation > 25:  # Add only if reputation is above 25
                        self.dao.add_member(new_agent)
                        self.dao.treasury.funds -= (
                            100  # Deduct the new agent's funds from the DAO treasury
                        )

    def create_new_agent(self, agent_class, step):
        agent_id = f"{agent_class.__name__}_{step}"
        agent_params = {
            "unique_id": agent_id,
            "model": self,
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
            del agent_params["tokens"]
            del agent_params["reputation"]
            del agent_params["location"]

        return agent_class(**agent_params)

    def remove_agents(self):
        agents_to_remove = []
        for agent_id, agent in self.dao.members.items():
            if agent.reputation < 10:  # Remove if reputation is below 10
                agents_to_remove.append(agent_id)
        for agent_id in agents_to_remove:
            self.dao.remove_member(agent_id)
