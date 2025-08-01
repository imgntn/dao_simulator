import subprocess
import sys

MENU = {
    '1': ('Run CLI Simulation', ['python', 'cli.py']),
    '2': ('Start Simulation Server', ['python', 'cli.py', '--serve']),
    '3': ('Launch Web Interface', ['python', 'cli.py', '--web']),
    '4': ('Quit', None),
}


def main() -> None:
    while True:
        print('\nDAO Simulator Launcher')
        for k, (name, _) in MENU.items():
            print(f'{k}) {name}')
        choice = input('Select option: ').strip()
        if choice not in MENU:
            print('Invalid option.')
            continue
        label, cmd = MENU[choice]
        if cmd is None:
            print('Exiting.')
            break
        print(f'Running: {" ".join(cmd)}')
        try:
            subprocess.run(cmd, check=True)
        except KeyboardInterrupt:
            print('\nInterrupted.')
        except subprocess.CalledProcessError as e:
            print(f'Error: {e}')


if __name__ == '__main__':
    main()
