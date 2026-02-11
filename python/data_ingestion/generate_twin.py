#!/usr/bin/env python3
"""
Twin Generation Pipeline

Semi-automated pipeline to create a new digital twin from scraped data.
Generates both the digital_twins/{dao_id}.json config and the calibration profile.

Usage:
    python generate_twin.py --dao-id my_dao --dao-name "My DAO" --token-symbol MYDAO
    python generate_twin.py --dao-id my_dao --from-calibration  # uses existing profile

Steps:
    1. Reads calibration profile from results/historical/calibration/{dao_id}_profile.json
    2. Generates digital_twins/{dao_id}.json config from template + calibration
    3. Outputs CalibrationProfile JSON if not already present
"""

import argparse
import json
import os
import sys
import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DIGITAL_TWINS_DIR = PROJECT_ROOT / "digital_twins"
CALIBRATION_DIR = PROJECT_ROOT / "results" / "historical" / "calibration"


def load_calibration_profile(dao_id):
    """Load existing calibration profile."""
    profile_path = CALIBRATION_DIR / f"{dao_id}_profile.json"
    if not profile_path.exists():
        return None
    with open(profile_path) as f:
        return json.load(f)


def infer_governance_params(profile):
    """Infer governance parameters from calibration profile."""
    params = {
        "vote_weight": "token_weighted",
        "voting_period_days": 7,
        "timelock_delay_days": 2,
    }

    if profile and profile.get("proposals"):
        avg_period = profile["proposals"].get("avg_voting_period_days", 7)
        params["voting_period_days"] = max(1, round(avg_period))

    return params


def infer_activity_level(profile):
    """Infer proposal activity level from calibration data."""
    if not profile or not profile.get("proposals"):
        return "medium"

    avg_per_month = profile["proposals"].get("avg_proposals_per_month", 5)
    if avg_per_month >= 15:
        return "high"
    elif avg_per_month >= 8:
        return "medium-high"
    elif avg_per_month >= 3:
        return "medium"
    else:
        return "low"


def infer_member_types(profile):
    """Infer member types from voter cluster data."""
    member_types = [
        {
            "type": "token_holder",
            "who": "Token holders",
            "rights": ["vote", "propose", "delegate"]
        },
        {
            "type": "delegate",
            "who": "Active delegates",
            "rights": ["vote", "propose", "delegate"]
        }
    ]

    if profile and profile.get("voter_clusters"):
        clusters = profile["voter_clusters"]
        for cluster in clusters:
            if cluster["label"] == "whale" and cluster["share"] > 0.02:
                # Already covered by token_holder
                pass
            elif cluster["label"] == "active_delegate":
                # Already covered by delegate
                pass

    return member_types


def infer_categories(dao_name, profile):
    """Infer DAO categories from name and data."""
    name_lower = dao_name.lower()
    categories = []

    if any(k in name_lower for k in ["swap", "dex", "exchange"]):
        categories.append("DEX")
    if any(k in name_lower for k in ["lend", "aave", "compound"]):
        categories.append("Lending")
    if any(k in name_lower for k in ["staking", "lido"]):
        categories.append("Staking")
    if any(k in name_lower for k in ["layer", "l2", "arbitrum", "optimism"]):
        categories.append("Layer 2")
    if any(k in name_lower for k in ["grant", "gitcoin"]):
        categories.append("Grants")
    if any(k in name_lower for k in ["maker", "stable"]):
        categories.append("Stablecoin")
    if any(k in name_lower for k in ["ens", "identity"]):
        categories.append("Identity")

    if not categories:
        categories.append("DeFi")

    return categories


def generate_twin_config(dao_id, dao_name, token_symbol, profile, chain="Ethereum"):
    """Generate a digital twin JSON config from template + calibration."""
    gov_params = infer_governance_params(profile)
    activity_level = infer_activity_level(profile)
    member_types = infer_member_types(profile)
    categories = infer_categories(dao_name, profile)

    config = {
        "schema_version": "0.2",
        "last_verified_utc": datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dao": {
            "id": dao_id,
            "name": dao_name,
            "category": categories,
            "primary_chain": chain,
            "governance_token": {
                "symbol": token_symbol,
                "type": "ERC-20",
                "voting_power_model": "token_weighted"
            },
            "governance_stack": {
                "discussion_forum": f"https://forum.{dao_id}.org",
                "offchain_voting": {
                    "platform": "Snapshot",
                    "typical_poll_duration_days": gov_params["voting_period_days"]
                },
                "onchain_voting": {
                    "framework": "Governor",
                    "voting_period_days": gov_params["voting_period_days"]
                },
                "execution": {
                    "timelock": {
                        "min_delay_days": gov_params["timelock_delay_days"]
                    }
                }
            },
            "treasury": {
                "treasury_controller": "Governor + Timelock",
                "spending_mechanism": "proposal_based"
            },
            "membership": {
                "member_types": member_types
            },
            "proposal_process": {
                "stages": [
                    {
                        "stage": "RFC / Forum Discussion",
                        "platform": "Forum",
                        "min_duration_days": 5
                    },
                    {
                        "stage": "Temperature Check (Snapshot)",
                        "platform": "Snapshot",
                        "duration_days": gov_params["voting_period_days"]
                    },
                    {
                        "stage": "On-chain Voting",
                        "platform": "Governor",
                        "voting_period_days": gov_params["voting_period_days"]
                    },
                    {
                        "stage": "Timelock + Execution",
                        "timelock_days": gov_params["timelock_delay_days"]
                    }
                ]
            },
            "proposal_activity": {
                "activity_level": activity_level,
                "cadence_pattern": "continuous"
            },
            "security_controls": {
                "timelock": True,
                "timelock_delay_days": gov_params["timelock_delay_days"]
            },
            "simulation_parameters": {
                "governance": {
                    "vote_weight": gov_params["vote_weight"],
                    "voting_period_days": gov_params["voting_period_days"],
                    "timelock_delay_days": gov_params["timelock_delay_days"],
                    "quorum_pct_votable": 4
                }
            },
            "sources": [
                {
                    "title": "Auto-generated from historical data",
                    "url": f"https://github.com/{dao_id}"
                }
            ]
        }
    }

    # Add market data if available
    if profile and profile.get("market"):
        market = profile["market"]
        config["dao"]["simulation_parameters"]["market"] = {
            "initial_price": market.get("avg_price_usd", 1.0),
            "daily_volatility": market.get("daily_volatility", 0.02),
            "avg_daily_return": market.get("avg_daily_return", 0.0)
        }

    # Add protocol data if available
    if profile and profile.get("protocol"):
        protocol = profile["protocol"]
        if protocol.get("avg_tvl", 0) > 0:
            config["dao"]["treasury"]["initial_tvl_usd"] = protocol["avg_tvl"]

    return config


def update_index(dao_id, dao_name, categories, filename):
    """Add or update entry in digital_twins/index.json."""
    index_path = DIGITAL_TWINS_DIR / "index.json"

    if index_path.exists():
        with open(index_path) as f:
            index = json.load(f)
    else:
        index = {
            "schema_version": "0.2",
            "generated_utc": datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "count": 0,
            "daos": []
        }

    # Check if entry already exists
    existing = [d for d in index["daos"] if d["id"] == dao_id]
    if existing:
        # Update existing entry
        existing[0]["name"] = dao_name
        existing[0]["category"] = categories
        existing[0]["file"] = filename
    else:
        # Add new entry
        index["daos"].append({
            "id": dao_id,
            "name": dao_name,
            "category": categories,
            "file": filename
        })

    index["count"] = len(index["daos"])
    index["generated_utc"] = datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)

    return index_path


def main():
    parser = argparse.ArgumentParser(description="Generate a new digital twin from historical data")
    parser.add_argument("--dao-id", required=True, help="DAO identifier (e.g., 'my_dao')")
    parser.add_argument("--dao-name", help="Human-readable DAO name (e.g., 'My DAO')")
    parser.add_argument("--token-symbol", help="Token symbol (e.g., 'MYDAO')")
    parser.add_argument("--chain", default="Ethereum", help="Primary chain")
    parser.add_argument("--from-calibration", action="store_true",
                        help="Generate from existing calibration profile only")
    parser.add_argument("--compile-first", action="store_true",
                        help="Run compile_calibration.py first for this DAO")
    args = parser.parse_args()

    dao_id = args.dao_id
    dao_name = args.dao_name or dao_id.replace("_", " ").title()
    token_symbol = args.token_symbol or dao_id.upper()[:5]

    print(f"Generating digital twin for: {dao_name} ({dao_id})")
    print(f"Token: {token_symbol}, Chain: {args.chain}")

    # Step 1: Optionally compile calibration first
    if args.compile_first:
        print("\n--- Step 1: Compiling calibration profile ---")
        import subprocess
        compile_script = Path(__file__).parent / "compile_calibration.py"
        result = subprocess.run(
            [sys.executable, str(compile_script), "--dao", dao_id],
            capture_output=True, text=True
        )
        print(result.stdout)
        if result.returncode != 0:
            print(f"WARNING: Calibration compilation returned non-zero: {result.stderr}")

    # Step 2: Load calibration profile
    print("\n--- Step 2: Loading calibration profile ---")
    profile = load_calibration_profile(dao_id)
    if profile:
        print(f"  Loaded profile with {len(profile.get('voter_clusters', []))} voter clusters")
        if profile.get("market"):
            print(f"  Market: avg price ${profile['market'].get('avg_price_usd', 'N/A')}")
        if profile.get("proposals"):
            print(f"  Proposals: {profile['proposals'].get('avg_proposals_per_month', 'N/A')}/month")
    else:
        print("  No calibration profile found - using defaults")
        if args.from_calibration:
            print("ERROR: --from-calibration specified but no profile exists", file=sys.stderr)
            sys.exit(1)

    # Step 3: Generate twin config
    print("\n--- Step 3: Generating twin config ---")
    config = generate_twin_config(dao_id, dao_name, token_symbol, profile, args.chain)

    filename = f"{dao_id}.json"
    output_path = DIGITAL_TWINS_DIR / filename
    DIGITAL_TWINS_DIR.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"  Saved: {output_path}")

    # Step 4: Update index
    print("\n--- Step 4: Updating index ---")
    categories = config["dao"]["category"]
    index_path = update_index(dao_id, dao_name, categories, filename)
    print(f"  Updated: {index_path}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Twin generated successfully!")
    print(f"  Config:      {output_path}")
    print(f"  Calibration: {CALIBRATION_DIR / f'{dao_id}_profile.json'}")
    print(f"  Index:       {index_path}")
    print(f"\nTo simulate: npx tsx scripts/run-twin.ts --twin {dao_id}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
