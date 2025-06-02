import argparse
from pathlib import Path

from dao_simulation import DAOSimulation
from settings import update_settings, load_settings, settings
from utils.path_utils import validate_directory, validate_file


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run DAO simulation")
    parser.add_argument("--steps", type=int, default=100, help="Number of steps to run")
    parser.add_argument(
        "--config", type=str, default=None, help="Path to settings file"
    )
    parser.add_argument(
        "--use-parallel",
        action="store_true",
        dest="use_parallel",
        help="Enable parallel scheduler",
    )
    parser.add_argument(
        "--use-async",
        action="store_true",
        dest="use_async",
        help="Enable async scheduler",
    )
    parser.add_argument("--max-workers", type=int, default=None)
    parser.add_argument("--strategy-path", type=str, default=None)
    parser.add_argument("--agent-plugin-path", type=str, default=None)
    parser.add_argument("--oracle-plugin-path", type=str, default=None)
    parser.add_argument("--websocket-port", type=int, default=None,
                        help="Expose websocket dashboard on this port")
    parser.add_argument("--event-db", type=str, default=None)
    parser.add_argument("--stats-db", type=str, default=None)
    parser.add_argument("--checkpoint-path", type=str, default=None)
    parser.add_argument("--checkpoint-interval", type=int, default=None)
    parser.add_argument("--resume-from", type=str, default=None)
    parser.add_argument("--report-file", type=str, default=None)
    parser.add_argument("--export-csv", type=str, default=None, help="Write CSV stats")
    parser.add_argument("--export-html", type=str, default=None, help="Write HTML report")
    parser.add_argument("--seed", type=int, default=None)
    for key in settings:
        if key.startswith("num_"):
            parser.add_argument(f"--{key}", type=int, default=None)
    args = parser.parse_args(argv)

    if args.config:
        cfg_path = validate_file(args.config, allowed_base=Path.cwd())
        load_settings(str(cfg_path))

    setting_updates = {
        k: getattr(args, k)
        for k in settings
        if hasattr(args, k) and getattr(args, k) is not None
    }
    if setting_updates:
        update_settings(**setting_updates)

    if args.strategy_path:
        from utils.voting_strategies import load_strategy_plugins, watch_strategy_plugins

        dir_path = validate_directory(args.strategy_path, allowed_base=Path.cwd())
        load_strategy_plugins(str(dir_path))
        watch_strategy_plugins(str(dir_path))

    if args.agent_plugin_path:
        from utils.agent_plugins import load_agent_plugins, watch_agent_plugins

        dir_path = validate_directory(args.agent_plugin_path, allowed_base=Path.cwd())
        load_agent_plugins(str(dir_path))
        watch_agent_plugins(str(dir_path))

    if args.oracle_plugin_path:
        from utils.oracles import load_oracle_plugins, watch_oracle_plugins

        dir_path = validate_directory(args.oracle_plugin_path, allowed_base=Path.cwd())
        load_oracle_plugins(str(dir_path))
        watch_oracle_plugins(str(dir_path))

    sim_kwargs = dict(
        use_parallel=args.use_parallel,
        use_async=args.use_async,
        max_workers=args.max_workers,
        report_file=args.export_html or args.report_file,
        export_csv=bool(args.export_csv),
        csv_filename=args.export_csv or "simulation_data.csv",
        event_db_filename=args.event_db,
        stats_db_filename=args.stats_db,
        checkpoint_interval=args.checkpoint_interval,
        checkpoint_path=args.checkpoint_path,
        seed=args.seed,
    )

    if args.resume_from:
        state_file = validate_file(args.resume_from, allowed_base=Path.cwd())
        sim = DAOSimulation.load_state(str(state_file), **sim_kwargs)
    else:
        sim = DAOSimulation(**sim_kwargs)

    dashboard = None
    if args.websocket_port is not None:
        from dashboard_server import DashboardServer

        dashboard = DashboardServer(sim.dao.event_bus, port=args.websocket_port)
        dashboard.start()

    sim.run(args.steps)
    if dashboard:
        dashboard.stop()


if __name__ == "__main__":
    main()
