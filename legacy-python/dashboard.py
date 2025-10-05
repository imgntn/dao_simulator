from __future__ import annotations
import argparse
import webbrowser
from web_server import WebServer


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="Start the unified web dashboard")
    parser.add_argument("--port", type=int, default=8003, help="Port for the dashboard")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    args = parser.parse_args(argv)

    server = WebServer(port=args.port)
    server.start()
    url = f"http://127.0.0.1:{args.port}"
    print(f"Dashboard running at {url}")
    if not args.no_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        import time
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    server.stop()


if __name__ == "__main__":  # pragma: no cover - manual usage
    main()
