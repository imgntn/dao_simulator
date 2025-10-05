#!/usr/bin/env python3
"""
DAO Simulation Observer - A unified interface to watch the DAO ecosystem like an ant hill

This script provides a comprehensive view of the simulation, showing:
- Live statistics and metrics
- Agent activities and interactions  
- Treasury and token dynamics
- Real-time events and proposals
- Network relationships and influence

Usage:
    python observe_simulation.py [--steps N] [--realtime] [--dashboard]
"""

import time
import threading
from datetime import datetime
from typing import Dict, Any
import json

from dao_simulation import DAOSimulation
from settings import settings, update_settings


class DAOObserver:
    """Observes and reports on DAO simulation state like watching an ant colony."""
    
    def __init__(self, simulation: DAOSimulation):
        self.sim = simulation
        self.dao = simulation.dao
        self.running = False
        self.step_count = 0
        self.start_time = None
        
    def print_header(self):
        """Print simulation header with ASCII art."""
        print("=" * 80)
        print("*** DAO ECOSYSTEM OBSERVER ***")
        print("   Watch your decentralized organization come alive!")
        print("=" * 80)
        print()
        
    def print_step_summary(self):
        """Print a concise summary of current simulation state."""
        print(f"\n*** STEP {self.step_count} SUMMARY ***")
        print("-" * 40)
        
        # Basic stats
        members = self.dao.members
        proposals = self.dao.proposals
        projects = self.dao.projects
        
        print(f"Members: {len(members)} | Proposals: {len(proposals)} | Projects: {len(projects)}")
        
        # Treasury info
        treasury = self.dao.treasury
        dao_price = treasury.get_token_price("DAO_TOKEN")
        total_value = sum(member.tokens for member in members) * dao_price
        
        print(f"DAO Token Price: ${dao_price:.2f} | Total Member Value: ${total_value:.2f}")
        
        # Agent activity
        active_proposals = [p for p in proposals if not p.closed]
        funded_projects = [p for p in projects if p.current_funding > 0]
        
        print(f"Active Proposals: {len(active_proposals)} | Funded Projects: {len(funded_projects)}")
        
        # Recent events
        if hasattr(self.sim, 'datacollector') and self.sim.datacollector.event_counts:
            recent_events = list(self.sim.datacollector.event_counts.items())[-3:]
            events_str = " | ".join([f"{event}: {count}" for event, count in recent_events])
            print(f"Recent Events: {events_str}")
            
    def print_agent_activity(self):
        """Show what different types of agents are doing."""
        print(f"\n*** AGENT ACTIVITY ***")
        print("-" * 30)
        
        agent_types = {}
        for member in self.dao.members:
            agent_type = type(member).__name__
            if agent_type not in agent_types:
                agent_types[agent_type] = []
            agent_types[agent_type].append(member)
            
        for agent_type, agents in agent_types.items():
            count = len(agents)
            avg_tokens = sum(a.tokens for a in agents) / count if count > 0 else 0
            avg_rep = sum(a.reputation for a in agents) / count if count > 0 else 0
            print(f"  {agent_type}: {count} agents | Avg Tokens: {avg_tokens:.1f} | Avg Rep: {avg_rep:.1f}")
            
    def print_network_insights(self):
        """Show network relationships and influence."""
        print(f"\n*** NETWORK INSIGHTS ***")
        print("-" * 35)
        
        # Find most influential members
        members_by_tokens = sorted(self.dao.members, key=lambda m: m.tokens, reverse=True)[:3]
        members_by_rep = sorted(self.dao.members, key=lambda m: m.reputation, reverse=True)[:3]
        
        print("Top Token Holders:")
        for i, member in enumerate(members_by_tokens, 1):
            print(f"  {i}. {member.unique_id}: {member.tokens:.1f} tokens")
            
        print("Top Reputation:")  
        for i, member in enumerate(members_by_rep, 1):
            print(f"  {i}. {member.unique_id}: {member.reputation:.1f} rep")
            
    def observe_step(self):
        """Run one simulation step and observe results."""
        self.step_count += 1
        
        # Clear screen for real-time updates (optional)
        # print("\033[2J\033[H")  # Uncomment for clearing screen
        
        self.print_step_summary()
        self.print_agent_activity()
        self.print_network_insights()
        
        print("-" * 80)
        
    def run_observation(self, steps: int = 50, delay: float = 1.0, realtime: bool = False):
        """Run the simulation while observing it."""
        self.print_header()
        self.start_time = datetime.now()
        self.running = True
        
        print(f"Starting observation for {steps} steps...")
        print(f"Step delay: {delay:.1f}s | Real-time mode: {realtime}")
        print()
        
        try:
            for step in range(steps):
                if not self.running:
                    break
                    
                # Run one simulation step  
                self.sim.step()
                
                # Observe and report
                self.observe_step()
                
                # Delay for observation
                if realtime:
                    time.sleep(delay)
                    
        except KeyboardInterrupt:
            print("\n\nObservation interrupted by user")
            
        finally:
            self.running = False
            end_time = datetime.now()
            duration = (end_time - self.start_time).total_seconds()
            print(f"\nObservation complete! Ran {self.step_count} steps in {duration:.1f}s")


def main():
    """Main entry point for the DAO observer."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Observe DAO simulation like an ant hill")
    parser.add_argument("--steps", type=int, default=20, help="Number of simulation steps")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between steps (seconds)")
    parser.add_argument("--realtime", action="store_true", help="Enable real-time delays")
    parser.add_argument("--dashboard", action="store_true", help="Also launch web dashboard")
    parser.add_argument("--agents", type=int, default=25, help="Total number of agents")
    
    args = parser.parse_args()
    
    # Configure simulation for good observation
    update_settings(
        num_developers=max(2, args.agents // 5),
        num_investors=max(2, args.agents // 8), 
        num_delegators=max(2, args.agents // 8),
        num_proposal_creators=max(2, args.agents // 10),
        num_validators=max(1, args.agents // 12),
        num_service_providers=max(1, args.agents // 15),
        num_arbitrators=max(1, args.agents // 20),
        num_regulators=max(1, args.agents // 20),
        num_passive_members=max(5, args.agents // 3),
        comment_probability=0.3,
        violation_probability=0.05,
        enable_marketing=True,
        marketing_level="low"
    )
    
    # Create and run simulation
    print("Initializing DAO simulation...")
    sim = DAOSimulation()
    
    # Launch dashboard if requested
    if args.dashboard:
        import subprocess
        import sys
        print("Starting web dashboard...")
        subprocess.Popen([sys.executable, "dashboard.py"], 
                        cwd=".", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("   Dashboard available at http://localhost:8003")
        time.sleep(2)  # Give dashboard time to start
    
    # Start observation
    observer = DAOObserver(sim)
    observer.run_observation(steps=args.steps, delay=args.delay, realtime=args.realtime)


if __name__ == "__main__":
    main()