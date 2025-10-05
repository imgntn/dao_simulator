"""Agent management utilities for the DAO simulation."""

import random
from typing import Dict, List, Type, Any, Optional

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
    COLLECTOR_TOKENS,
    DEFAULT_AGENT_REPUTATION,
    DEFAULT_AGENT_TOKENS,
    DELEGATOR_BUDGET,
    DELEGATOR_TOKENS,
    DEVELOPER_TOKENS,
    EXTERNAL_PARTNER_TOKENS,
    INVESTOR_BUDGET,
    INVESTOR_TOKENS,
    LIQUID_DELEGATOR_BUDGET,
    LIQUID_DELEGATOR_TOKENS,
    NEW_MEMBER_COST,
    NEW_MEMBER_FUND_REQUIREMENT,
    NEW_MEMBER_INTERVAL,
    NEW_MEMBERS_PER_INTERVAL,
    PASSIVE_MEMBER_TOKENS,
    PROPOSAL_CREATOR_TOKENS,
    REGULATOR_TOKENS,
    SERVICE_PROVIDER_BUDGET,
    SERVICE_PROVIDER_TOKENS,
    SPECULATOR_TOKENS,
    TRADER_TOKENS,
    VALIDATOR_TOKENS,
)
from utils.locations import generate_random_location


class AgentManager:
    """Manages agent creation, caching, and lifecycle operations."""
    
    def __init__(self, dao_simulation):
        self.simulation = dao_simulation
        self._agent_type_cache: Dict[str, List[Any]] = {}
        self._cache_dirty = True
        
        # Agent configuration templates
        self.agent_configs = {
            Developer: {
                "tokens": DEVELOPER_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "skillset": ["Python", "JavaScript"]
            },
            Investor: {
                "tokens": INVESTOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "investment_budget": INVESTOR_BUDGET
            },
            Trader: {
                "tokens": TRADER_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            AdaptiveInvestor: {
                "tokens": ADAPTIVE_INVESTOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "investment_budget": ADAPTIVE_INVESTOR_BUDGET,
            },
            Delegator: {
                "tokens": DELEGATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "delegation_budget": DELEGATOR_BUDGET,
            },
            LiquidDelegator: {
                "tokens": LIQUID_DELEGATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "delegation_budget": LIQUID_DELEGATOR_BUDGET,
            },
            ProposalCreator: {
                "tokens": PROPOSAL_CREATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            Validator: {
                "tokens": VALIDATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            ServiceProvider: {
                "tokens": SERVICE_PROVIDER_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "service_budget": SERVICE_PROVIDER_BUDGET,
            },
            Arbitrator: {
                "tokens": ARBITRATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "arbitration_capacity": ARBITRATOR_CAPACITY,
            },
            Regulator: {
                "tokens": REGULATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            Auditor: {
                "tokens": AUDITOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            BountyHunter: {
                "tokens": BOUNTY_HUNTER_TOKENS,
                "reputation": BOUNTY_HUNTER_REPUTATION
            },
            ExternalPartner: {
                "tokens": EXTERNAL_PARTNER_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION,
                "voting_strategy": None,
            },
            Artist: {
                "tokens": ARTIST_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            Collector: {
                "tokens": COLLECTOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            Speculator: {
                "tokens": SPECULATOR_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
            PassiveMember: {
                "tokens": PASSIVE_MEMBER_TOKENS,
                "reputation": DEFAULT_AGENT_REPUTATION
            },
        }
    
    def get_agents_by_type(self, agent_type: str) -> List[Any]:
        """Get agents of a specific type using cache for performance."""
        if self._cache_dirty or agent_type not in self._agent_type_cache:
            self._rebuild_agent_cache()
        return self._agent_type_cache.get(agent_type, [])
    
    def _rebuild_agent_cache(self) -> None:
        """Rebuild the agent type cache."""
        self._agent_type_cache.clear()
        for agent in self.simulation.dao.members:
            agent_class = type(agent).__name__
            if agent_class not in self._agent_type_cache:
                self._agent_type_cache[agent_class] = []
            self._agent_type_cache[agent_class].append(agent)
        self._cache_dirty = False
    
    def invalidate_cache(self) -> None:
        """Mark cache as dirty - should be called when agents are added/removed."""
        self._cache_dirty = True
    
    def create_agent(self, agent_class: Type, agent_id: str, **kwargs) -> Any:
        """Create a new agent with appropriate configuration."""
        base_config = self.agent_configs.get(agent_class, {
            "tokens": DEFAULT_AGENT_TOKENS,
            "reputation": DEFAULT_AGENT_REPUTATION
        })
        
        # Merge base config with provided kwargs
        config = {**base_config, **kwargs}
        
        return agent_class(
            unique_id=agent_id,
            model=self.simulation,
            location=generate_random_location(),
            **config
        )
    
    def add_new_members(self) -> None:
        """Add new members periodically if treasury has sufficient funds."""
        agent_classes = [
            Developer, Investor, Trader, AdaptiveInvestor, Delegator,
            LiquidDelegator, ProposalCreator, Validator, ServiceProvider,
            Arbitrator, Regulator, Auditor, BountyHunter, ExternalPartner,
            Artist, Collector, Speculator, PassiveMember
        ]
        
        for _ in range(NEW_MEMBERS_PER_INTERVAL):
            if (self.simulation.schedule.steps > 0 and 
                self.simulation.schedule.steps % NEW_MEMBER_INTERVAL == 0):
                if self.simulation.dao.treasury.funds >= NEW_MEMBER_FUND_REQUIREMENT:
                    agent_class = random.choice(agent_classes)
                    new_agent = self.create_agent(
                        agent_class, 
                        f"{agent_class.__name__}_{self.simulation.schedule.steps}"
                    )
                    
                    if new_agent.reputation > 25:  # Add only if reputation is above 25
                        self.simulation.dao.add_member(new_agent)
                        self.simulation.schedule.add(new_agent)
                        self.invalidate_cache()
                        
                        # Add new agent to the space for visualization
                        if self.simulation.space is not None:
                            import random
                            x = random.randint(0, self.simulation.space.width - 1)
                            y = random.randint(0, self.simulation.space.height - 1)
                            self.simulation.space.place_agent(new_agent, (x, y))
                        
                        self.simulation.dao.treasury.withdraw(
                            "DAO_TOKEN", NEW_MEMBER_COST, step=self.simulation.schedule.steps
                        )
    
    def cull_members(self) -> None:
        """Remove members with negative reputation."""
        agents_to_remove = []
        for agent in self.simulation.dao.members:
            if agent.reputation < 0:
                agents_to_remove.append(agent)
        
        for agent in agents_to_remove:
            self.simulation.dao.remove_member(agent)
            self.simulation.schedule.remove(agent)
            self.invalidate_cache()
            
            # Remove agent from the space for visualization
            if self.simulation.space is not None:
                self.simulation.space.remove_agent(agent)