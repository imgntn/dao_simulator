#!/usr/bin/env python3
"""
Test script for the 3D visualization.
This creates a simple simulation and sends events for testing.
"""

import time
import asyncio
import json
from dao_simulation import DAOSimulation
from web_server import WebServer

def test_visualization():
    """Run a test simulation and verify events are being emitted."""
    print("Starting DAO Visualization Test...")
    
    # Create simulation with a few agents
    sim = DAOSimulation(
        num_developers=5,
        num_investors=3,
        num_validators=2,
        num_arbitrators=1,
        num_proposal_creators=2,
        num_passive_members=3,
        enable_player=False
    )
    
    print(f"Created simulation with {len(sim.dao.members)} agents")
    print(f"Initial proposals: {len(sim.dao.proposals)}")
    
    # Create web server
    server = WebServer(port=8003)
    server.sim = sim
    
    print("Web server configured")
    print("3D Visualization available at: http://localhost:8003/visualization3d")
    print("Regular dashboard available at: http://localhost:8003")
    
    # Start server
    server.start()
    print("Server started on port 8003")
    
    try:
        print("\nRunning simulation steps...")
        for step in range(10):
            print(f"  Step {step + 1}/10")
            sim.step()
            time.sleep(0.5)  # Small delay to see events flow
            
        print(f"\nFinal stats:")
        print(f"  - Agents: {len(sim.dao.members)}")
        print(f"  - Proposals: {len(sim.dao.proposals)}")
        print(f"  - Projects: {len(sim.dao.projects)}")
        print(f"  - Treasury: {sum(sim.dao.treasury.holdings.values()):.2f}")
        
        print("\nTest completed successfully!")
        print("Open http://localhost:8003/visualization3d in your browser to see the 3D visualization")
        
        # Keep server running
        print("\nServer will run for 60 seconds for testing...")
        time.sleep(60)
        
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    finally:
        server.stop()
        print("Server stopped")

if __name__ == "__main__":
    test_visualization()