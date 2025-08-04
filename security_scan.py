#!/usr/bin/env python3
"""Security scanning script for the DAO simulator."""

import subprocess
import sys
from pathlib import Path


def run_safety_check():
    """Run safety vulnerability scanning."""
    print("🔒 Running safety vulnerability scan...")
    try:
        result = subprocess.run(
            ["safety", "check", "--json"],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            print("✅ No known vulnerabilities found")
        else:
            print("⚠️  Security vulnerabilities detected:")
            print(result.stdout)
            return False
    except subprocess.TimeoutExpired:
        print("❌ Safety scan timed out")
        return False
    except FileNotFoundError:
        print("❌ Safety not installed. Run: pip install safety")
        return False
    except Exception as e:
        print(f"❌ Safety scan failed: {e}")
        return False
    return True


def run_bandit_scan():
    """Run bandit static security analysis."""
    print("🔍 Running bandit static security analysis...")
    try:
        result = subprocess.run(
            ["bandit", "-r", ".", "-f", "json", "-c", ".bandit"],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            print("✅ No security issues found")
        else:
            print("⚠️  Security issues detected:")
            print(result.stdout)
            return False
    except subprocess.TimeoutExpired:
        print("❌ Bandit scan timed out")
        return False
    except FileNotFoundError:
        print("❌ Bandit not installed. Run: pip install bandit")
        return False
    except Exception as e:
        print(f"❌ Bandit scan failed: {e}")
        return False
    return True


def main():
    """Run all security scans."""
    print("🚀 Starting security scan suite...")
    
    safety_ok = run_safety_check()
    bandit_ok = run_bandit_scan()
    
    if safety_ok and bandit_ok:
        print("✅ All security scans passed!")
        return 0
    else:
        print("❌ Security scans failed. Please review issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())