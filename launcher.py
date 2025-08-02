import subprocess
import sys

MENU = {
    "1": ("Run CLI Simulation", [sys.executable, "cli.py"]),
    "2": ("Start Simulation Server", [sys.executable, "cli.py", "--serve"]),
    "3": ("Launch Dashboard", [sys.executable, "dashboard.py"]),
    "4": (
        "Launch Admin Panel",
        [sys.executable, "-m", "solara", "run", "admin_app.py"],
    ),
    "5": ("Launch Visualization", [sys.executable, "mesa_app.py"]),
    "6": ("Quit", None),
}


def main() -> None:
    while True:
        print("\nDAO Simulator Launcher")
        for k, (name, _) in MENU.items():
            print(f"{k}) {name}")
        choice = input("Select option: ").strip()
        if choice not in MENU:
            print("Invalid option.")
            continue
        label, cmd = MENU[choice]
        if cmd is None:
            print("Exiting.")
            break
        print(f'Running: {" ".join(cmd)}')
        try:
            subprocess.run(cmd, check=True)
        except KeyboardInterrupt:
            print("\nInterrupted.")
        except subprocess.CalledProcessError as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
