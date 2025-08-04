#!/usr/bin/env python3
"""
Integrated DAO Simulator Launcher - One-stop shop for running the complete ecosystem

This launcher integrates all simulation components:
- Core simulation engine
- Real-time observation  
- Web dashboard
- Visualization tools
- Admin controls
- Data collection and analysis

Usage:
    python integrated_launcher.py [--mode MODE] [--steps N] [--agents N]
"""

import subprocess
import sys
import time
import threading
import webbrowser
from pathlib import Path
from typing import Optional
import json

from dao_simulation import DAOSimulation
from settings import settings, update_settings


class IntegratedLauncher:
    """Manages the integrated DAO simulation ecosystem."""
    
    def __init__(self):
        self.processes = []
        self.simulation_thread = None
        self.running = False
        self.sim = None
        
    def cleanup(self):
        """Clean up all running processes."""
        print("\n🧹 Cleaning up processes...")
        self.running = False
        
        for proc in self.processes:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except:
                try:
                    proc.kill()
                except:
                    pass
                    
    def launch_dashboard(self, port: int = 8003):
        """Launch the web dashboard."""
        print(f"🌐 Starting web dashboard on port {port}...")
        proc = subprocess.Popen(
            [sys.executable, "dashboard.py", "--port", str(port)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        self.processes.append(proc)
        time.sleep(3)  # Give dashboard time to start
        
        dashboard_url = f"http://localhost:{port}"
        print(f"   📊 Dashboard: {dashboard_url}")
        return dashboard_url
        
    def launch_admin_panel(self, port: int = 8004):
        """Launch the admin control panel."""
        print(f"⚙️  Starting admin panel on port {port}...")
        try:
            proc = subprocess.Popen(
                [sys.executable, "-m", "solara", "run", "admin_app.py", "--port", str(port)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            self.processes.append(proc)
            time.sleep(3)
            
            admin_url = f"http://localhost:{port}"
            print(f"   🎛️  Admin Panel: {admin_url}")
            return admin_url
        except Exception as e:
            print(f"   ⚠️  Admin panel failed to start: {e}")
            return None
            
    def launch_mesa_viz(self, port: int = 8005):
        """Launch Mesa visualization."""
        print(f"📈 Starting Mesa visualization on port {port}...")
        try:
            proc = subprocess.Popen(
                [sys.executable, "mesa_app.py", str(port)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            self.processes.append(proc)
            time.sleep(5)  # Give more time for Solara to start
            
            viz_url = f"http://localhost:{port}"
            print(f"   📊 Visualization: {viz_url}")
            return viz_url
        except Exception as e:
            print(f"   ⚠️  Mesa visualization failed to start: {e}")
            return None
            
    def run_simulation_thread(self, steps: int, delay: float):
        """Run simulation in a background thread."""
        from observe_simulation import DAOObserver
        
        observer = DAOObserver(self.sim)
        observer.run_observation(steps=steps, delay=delay, realtime=True)
        
    def print_startup_banner(self):
        """Print a nice startup banner."""
        print("=" * 80)
        print("🏛️  INTEGRATED DAO SIMULATION ECOSYSTEM 🏛️")
        print("   Complete toolkit for observing decentralized organizations")
        print("=" * 80)
        print()
        
    def print_usage_guide(self, urls: dict):
        """Print guide for using the integrated system."""
        print("\n" + "=" * 60)
        print("🎯 USAGE GUIDE")
        print("=" * 60)
        print()
        print("Your DAO simulation is now running with multiple interfaces:")
        print()
        
        if urls.get('dashboard'):
            print(f"📊 UNIFIED DASHBOARD & ADMIN: {urls['dashboard']}")
            print("   - Real-time metrics and charts")
            print("   - Agent activity monitoring") 
            print("   - Treasury and token tracking")
            print("   - Configure simulation parameters")
            print("   - Control agent behaviors")
            print("   - Player controls and interaction")
            print("   - Event scheduling and management")
            print()
            
        if urls.get('viz'):
            print(f"📈 VISUALIZATION: {urls['viz']}")  
            print("   - Interactive network graphs")
            print("   - Agent relationship maps")
            print("   - Dynamic simulation view")
            print()
            
        print("💡 TERMINAL OBSERVER:")
        print("   - Live step-by-step updates")
        print("   - Agent activity summaries")
        print("   - Network influence tracking")
        print()
        print("🛑 Press Ctrl+C to stop all components")
        print("=" * 60)
        print()
        
    def run_integrated_mode(self, steps: int = 100, delay: float = 3.0, 
                          agents: int = 30, open_browser: bool = True):
        """Run the full integrated simulation experience."""
        
        self.print_startup_banner()
        
        # Configure simulation
        print("🔧 Configuring DAO simulation...")
        update_settings(
            num_developers=max(3, agents // 4),
            num_investors=max(2, agents // 6),
            num_delegators=max(2, agents // 6), 
            num_proposal_creators=max(2, agents // 8),
            num_validators=max(2, agents // 10),
            num_service_providers=max(1, agents // 12),
            num_arbitrators=max(1, agents // 15),
            num_regulators=max(1, agents // 15),
            num_passive_members=max(5, agents // 2),
            num_traders=max(1, agents // 20),
            num_artists=max(1, agents // 25),
            num_collectors=max(1, agents // 25),
            comment_probability=0.4,
            violation_probability=0.08,
            enable_marketing=True,
            marketing_level="medium",
            enable_player=True
        )
        
        # Initialize simulation
        print("🚀 Initializing DAO simulation...")
        self.sim = DAOSimulation()
        
        # Launch web interfaces
        urls = {}
        urls['dashboard'] = self.launch_dashboard()
        # The admin panel is built into the dashboard, no need for separate launch
        # urls['admin'] = self.launch_admin_panel()  
        urls['viz'] = self.launch_mesa_viz()
        
        # Open browser windows if requested
        if open_browser:
            print("🌐 Opening browser windows...")
            for name, url in urls.items():
                if url:
                    webbrowser.open_new_tab(url)
                    time.sleep(1)
                    
        # Print usage guide
        self.print_usage_guide(urls)
        
        # Start simulation observation
        print("👀 Starting simulation observation...")
        self.running = True
        
        try:
            # Run integrated observation
            self.simulation_thread = threading.Thread(
                target=self.run_simulation_thread,
                args=(steps, delay)
            )
            self.simulation_thread.daemon = True
            self.simulation_thread.start()
            
            # Keep main thread alive
            while self.running and self.simulation_thread.is_alive():
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Shutting down integrated simulation...")
            
        finally:
            self.cleanup()
            print("✅ All components stopped successfully!")
            
    def run_observation_only(self, steps: int = 50, delay: float = 2.0, agents: int = 25):
        """Run just the terminal observation mode."""
        
        print("🔧 Configuring observation-only simulation...")
        update_settings(
            num_developers=max(2, agents // 5),
            num_investors=max(2, agents // 8),
            num_delegators=max(2, agents // 8),
            num_proposal_creators=max(2, agents // 10),
            num_validators=max(1, agents // 12),
            num_service_providers=max(1, agents // 15),
            num_arbitrators=max(1, agents // 20),
            num_regulators=max(1, agents // 20),
            num_passive_members=max(5, agents // 3),
            comment_probability=0.3,
            violation_probability=0.05
        )
        
        # Use the observer directly
        from observe_simulation import main as observe_main
        observe_main()
        
    def run_dashboard_only(self):
        """Run just the web dashboard."""
        print("🌐 Starting dashboard-only mode...")
        
        urls = {}
        urls['dashboard'] = self.launch_dashboard()
        
        print(f"\n📊 Dashboard available at: {urls['dashboard']}")
        print("🛑 Press Ctrl+C to stop")
        
        try:
            # Keep running until interrupted
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n⚠️  Stopping dashboard...")
        finally:
            self.cleanup()


def main():
    """Main entry point for integrated launcher."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Integrated DAO Simulation Launcher")
    parser.add_argument("--mode", 
                       choices=["integrated", "observe", "dashboard"],
                       default="integrated",
                       help="Launch mode")
    parser.add_argument("--steps", type=int, default=100, help="Simulation steps")
    parser.add_argument("--delay", type=float, default=3.0, help="Step delay (seconds)")
    parser.add_argument("--agents", type=int, default=30, help="Total number of agents")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser windows")
    
    args = parser.parse_args()
    
    launcher = IntegratedLauncher()
    
    try:
        if args.mode == "integrated":
            launcher.run_integrated_mode(
                steps=args.steps,
                delay=args.delay, 
                agents=args.agents,
                open_browser=not args.no_browser
            )
        elif args.mode == "observe":
            launcher.run_observation_only(
                steps=args.steps,
                delay=args.delay,
                agents=args.agents
            )
        elif args.mode == "dashboard":
            launcher.run_dashboard_only()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        launcher.cleanup()
        sys.exit(1)


if __name__ == "__main__":
    main()