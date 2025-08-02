import shutil
import shlex
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


def launch_in_terminal(cmd: list[str]) -> None:
    """Launch command in a new terminal window."""
    if sys.platform.startswith("win"):
        subprocess.Popen([
            "start",
            "cmd",
            "/k",
            " ".join(cmd),
        ], shell=True)
        return

    quoted = " ".join(shlex.quote(c) for c in cmd)

    if sys.platform == "darwin":
        subprocess.Popen([
            "osascript",
            "-e",
            f'tell application "Terminal" to do script "{quoted}"',
        ])
        return

    terminals = [
        ["x-terminal-emulator", "-e"],
        ["gnome-terminal", "--"],
        ["konsole", "-e"],
        ["xfce4-terminal", "-e"],
        ["xterm", "-e"],
    ]
    for term in terminals:
        path = shutil.which(term[0])
        if path:
            subprocess.Popen([path, *term[1:], *cmd])
            return
    print("No supported terminal emulator found; running in background.")
    subprocess.Popen(cmd)


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
        print(f'Launching: {" ".join(cmd)}')
        try:
            launch_in_terminal(cmd)
        except Exception as e:
            print(f"Error launching command: {e}")


if __name__ == "__main__":
    main()
