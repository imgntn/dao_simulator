import argparse
from dao_simulation import DAOSimulation
from settings import update_settings, settings


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run DAO simulation")
    parser.add_argument("--steps", type=int, default=100, help="Number of steps to run")
    parser.add_argument("--use-parallel", action="store_true", dest="use_parallel", help="Enable parallel scheduler")
    parser.add_argument("--use-async", action="store_true", dest="use_async", help="Enable async scheduler")
    parser.add_argument("--max-workers", type=int, default=None)
    for key in settings:
        if key.startswith("num_"):
            parser.add_argument(f"--{key}", type=int, default=None)
    args = parser.parse_args(argv)

    setting_updates = {k: getattr(args, k) for k in settings if hasattr(args, k) and getattr(args, k) is not None}
    if setting_updates:
        update_settings(**setting_updates)

    sim = DAOSimulation(use_parallel=args.use_parallel, use_async=args.use_async, max_workers=args.max_workers)
    sim.run(args.steps)


if __name__ == "__main__":
    main()
