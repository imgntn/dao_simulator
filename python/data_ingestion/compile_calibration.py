#!/usr/bin/env python3
"""
Calibration Profile Compiler

Reads historical CSVs from results/historical/ and computes per-DAO
CalibrationProfile JSON files used by the simulator's digital twin system.

Usage:
    python compile_calibration.py [--dao DAO_ID] [--output-dir DIR]
"""

import argparse
import hashlib
import json
import logging
import math
import os
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd
import numpy as np

# Project root (two levels up from this script)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
HISTORICAL_DIR = PROJECT_ROOT / "results" / "historical"
DEFAULT_OUTPUT_DIR = HISTORICAL_DIR / "calibration"

DATE_COLUMNS = {
    "market_daily": "timestamp_iso",
    "snapshot_proposals": "created_iso",
    "snapshot_votes": "created_iso",
    "tally_proposals": "created_at",
    "tally_votes": "created_at",
    "maker_polls": "start_date",
    "maker_poll_tallies": "block_timestamp",
    "forum_topics": "created_at",
    "forum_posts": "created_at",
    "protocol_tvl": "timestamp_iso",
    "protocol_fees": "timestamp_iso",
    "protocol_revenue": "timestamp_iso",
}

logger = logging.getLogger(__name__)


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def optional_float(val):
    """Return a finite float or None without manufacturing a numeric fallback."""
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def atomic_json_dump(path, value):
    """Durably replace a JSON artifact only after its complete payload is written."""
    path = Path(path)
    temporary_path = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary_path.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, indent=2, allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def gini_coefficient(values):
    """Compute Gini coefficient for a list of non-negative numbers."""
    arr = np.array(values, dtype=float)
    arr = arr[np.isfinite(arr)]
    if len(arr) == 0 or arr.sum() == 0:
        return 0.0
    sorted_arr = np.sort(arr)
    n = len(sorted_arr)
    index = np.arange(1, n + 1)
    return float((2 * np.sum(index * sorted_arr)) / (n * np.sum(sorted_arr)) - (n + 1) / n)


def participation_histogram(rates, buckets=10):
    """Create participation rate histogram with equal-width buckets [0-10%, 10-20%, ...]."""
    hist = [0] * buckets
    for r in rates:
        idx = min(int(r * buckets), buckets - 1)
        hist[idx] += 1
    total = sum(hist)
    if total > 0:
        hist = [h / total for h in hist]
    return hist


def full_month_index(period):
    """Return every calendar month in a declared inclusive partition."""
    if not period or not period.get("start") or not period.get("end"):
        return None
    start = pd.Timestamp(period["start"]).to_period("M")
    end = pd.Timestamp(period["end"]).to_period("M")
    return pd.period_range(start=start, end=end, freq="M")


def snapshot_binary_outcomes(proposals, votes):
    """Classify Snapshot yes/no and for/against proposals from weighted votes."""
    if proposals.empty or votes.empty:
        return []
    votes_by_proposal = {
        proposal_id: frame
        for proposal_id, frame in votes.groupby("proposal_id")
    }
    outcomes = []
    for _, proposal in proposals.iterrows():
        try:
            choices = json.loads(proposal.get("choices") or "[]")
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        normalized = [str(choice).strip().lower() for choice in choices]
        pairs = (
            ("yes", "no"),
            ("for", "against"),
            ("yea", "nay"),
            ("yae", "nay"),
            ("approve", "reject"),
        )
        labels = next(
            ((yes, no) for yes, no in pairs if yes in normalized and no in normalized),
            None,
        )
        proposal_votes = votes_by_proposal.get(proposal.get("proposal_id"))
        if labels is None or proposal_votes is None or proposal_votes.empty:
            continue
        yes_label, no_label = labels
        index_to_label = {index + 1: label for index, label in enumerate(normalized)}
        totals = {yes_label: 0.0, no_label: 0.0}
        for _, vote in proposal_votes.iterrows():
            voting_power = optional_float(vote.get("vp"))
            if voting_power is None or voting_power < 0:
                continue
            raw_choice = vote.get("choice")
            try:
                choice_index = int(float(raw_choice))
                label = index_to_label.get(choice_index)
                if label in totals:
                    totals[label] += voting_power
            except (TypeError, ValueError):
                try:
                    weighted = json.loads(str(raw_choice))
                    if isinstance(weighted, dict) and weighted:
                        valid_weights = {}
                        for key, value in weighted.items():
                            weight = optional_float(value)
                            if weight is not None and weight >= 0:
                                valid_weights[key] = weight
                        weight_total = sum(valid_weights.values())
                        if weight_total > 0:
                            for key, weight in valid_weights.items():
                                try:
                                    label = index_to_label.get(int(key))
                                except (TypeError, ValueError):
                                    continue
                                if label in totals:
                                    totals[label] += voting_power * weight / weight_total
                except (TypeError, ValueError, json.JSONDecodeError):
                    pass
        yes_power = totals[yes_label]
        no_power = totals[no_label]
        if yes_power + no_power <= 0:
            continue
        quorum = optional_float(proposal.get("quorum"))
        scores_total = optional_float(proposal.get("scores_total"))
        if quorum is not None and quorum > 0 and scores_total is None:
            continue
        meets_quorum = quorum is None or quorum <= 0 or scores_total >= quorum
        outcomes.append({
            "passed": yes_power > no_power and meets_quorum,
            "for_share": yes_power / (yes_power + no_power),
        })
    return outcomes


def detect_drawdowns(prices, threshold=0.20):
    """Detect drawdown events (>threshold drops from peak)."""
    if len(prices) < 2:
        return []

    drawdowns = []
    peak = prices[0]
    peak_idx = 0
    in_drawdown = False
    drawdown_start = 0

    for i, p in enumerate(prices):
        if p > peak:
            if in_drawdown:
                magnitude = (peak - min(prices[drawdown_start:i])) / peak
                if magnitude >= threshold:
                    drawdowns.append({
                        "start_idx": drawdown_start,
                        "end_idx": i,
                        "magnitude": round(magnitude, 4),
                    })
                in_drawdown = False
            peak = p
            peak_idx = i
        elif peak > 0:
            decline = (peak - p) / peak
            if decline >= threshold and not in_drawdown:
                in_drawdown = True
                drawdown_start = peak_idx

    # Handle ongoing drawdown at end of series
    if in_drawdown:
        magnitude = (peak - min(prices[drawdown_start:])) / peak
        if magnitude >= threshold:
            drawdowns.append({
                "start_idx": drawdown_start,
                "end_idx": len(prices) - 1,
                "magnitude": round(magnitude, 4),
            })

    return drawdowns


def tvl_trend(tvl_series):
    """Determine TVL trend: growing, stable, or declining."""
    if len(tvl_series) < 30:
        return None
    # Compare first quarter average to last quarter average
    q_len = len(tvl_series) // 4
    first_q = np.mean(tvl_series[:q_len])
    last_q = np.mean(tvl_series[-q_len:])
    if (
        not math.isfinite(first_q)
        or not math.isfinite(last_q)
        or first_q <= 0
    ):
        return None
    change = (last_q - first_q) / first_q
    if change > 0.15:
        return "growing"
    elif change < -0.15:
        return "declining"
    return "stable"


# =============================================================================
# LOAD CSV DATA
# =============================================================================

def load_csv(subpath, required=False):
    """Load a CSV from the historical data directory."""
    filepath = HISTORICAL_DIR / subpath
    if not filepath.exists():
        if required:
            print(f"WARNING: Required file not found: {filepath}", file=sys.stderr)
        return pd.DataFrame()
    try:
        return pd.read_csv(filepath, low_memory=False)
    except Exception as e:
        print(f"WARNING: Failed to read {filepath}: {e}", file=sys.stderr)
        return pd.DataFrame()


def load_all_data():
    """Load all historical CSV data."""
    return {
        "market_daily": load_csv("market/market_daily.csv"),
        "snapshot_proposals": load_csv("governance/snapshot_proposals.csv"),
        "snapshot_votes": load_csv("governance/snapshot_votes.csv"),
        "tally_proposals": load_csv("governance/tally_proposals.csv"),
        "tally_votes": load_csv("governance/tally_votes.csv"),
        "maker_polls": load_csv("governance/maker_polls.csv"),
        "maker_poll_tallies": load_csv("governance/maker_poll_tallies.csv"),
        "forum_topics": load_csv("forum/forum_topics.csv"),
        "forum_posts": load_csv("forum/forum_posts.csv"),
        "protocol_tvl": load_csv("protocol/protocol_tvl_daily.csv"),
        "protocol_fees": load_csv("protocol/protocol_fees_daily.csv"),
        "protocol_revenue": load_csv("protocol/protocol_revenue_daily.csv"),
    }


def filter_data_by_period(data, start_date=None, end_date=None):
    """Return source tables restricted to an inclusive UTC evaluation period."""
    if start_date is None and end_date is None:
        return data

    start = pd.Timestamp(start_date, tz="UTC") if start_date else None
    end = pd.Timestamp(end_date, tz="UTC") if end_date else None
    if end is not None:
        # Date-only end bounds are inclusive through the end of that UTC day.
        end = end + pd.Timedelta(days=1) - pd.Timedelta(microseconds=1)

    filtered = {}
    for key, df in data.items():
        if df.empty:
            filtered[key] = df
            continue
        date_col = DATE_COLUMNS.get(key)
        if not date_col or date_col not in df.columns:
            filtered[key] = df
            continue
        dates = pd.to_datetime(df[date_col], errors="coerce", utc=True)
        mask = dates.notna()
        if start is not None:
            mask &= dates >= start
        if end is not None:
            mask &= dates <= end
        filtered[key] = df.loc[mask].copy()
    return filtered


def source_manifest(data):
    """Describe the exact source rows used to compile a profile."""
    result = {}
    for key, df in data.items():
        date_col = DATE_COLUMNS.get(key)
        entry = {"rows": int(len(df)), "date_column": date_col}
        if not df.empty and date_col and date_col in df.columns:
            dates = pd.to_datetime(df[date_col], errors="coerce", utc=True).dropna()
            entry["min_date"] = dates.min().isoformat() if len(dates) else None
            entry["max_date"] = dates.max().isoformat() if len(dates) else None
        result[key] = entry
    return result


def source_quality_index(raw_data, selected_data, dao_ids):
    """Build per-DAO exclusion/malformed-date counts in one pass per source."""
    quality_by_dao = {dao_id: {} for dao_id in dao_ids}
    for key, raw_frame in raw_data.items():
        selected_frame = selected_data.get(key, pd.DataFrame())
        date_col = DATE_COLUMNS.get(key)
        has_dao = not raw_frame.empty and "dao_id" in raw_frame.columns
        if has_dao:
            raw_counts = raw_frame.groupby("dao_id", observed=True).size()
            selected_counts = (
                selected_frame.groupby("dao_id", observed=True).size()
                if not selected_frame.empty and "dao_id" in selected_frame.columns
                else pd.Series(dtype=int)
            )
            if date_col and date_col in raw_frame.columns:
                invalid_mask = pd.to_datetime(
                    raw_frame[date_col], errors="coerce", utc=True
                ).isna()
                invalid_counts = (
                    raw_frame.assign(_invalid_date=invalid_mask)
                    .groupby("dao_id", observed=True)["_invalid_date"]
                    .sum()
                )
            else:
                invalid_counts = pd.Series(dtype=int)
        else:
            raw_counts = pd.Series(dtype=int)
            selected_counts = pd.Series(dtype=int)
            invalid_counts = pd.Series(dtype=int)

        for dao_id in dao_ids:
            raw_rows = int(raw_counts.get(dao_id, len(raw_frame) if not has_dao else 0))
            selected_rows = int(
                selected_counts.get(
                    dao_id,
                    len(selected_frame) if not has_dao else 0,
                )
            )
            invalid_dates = int(invalid_counts.get(dao_id, 0))
            quality_by_dao[dao_id][key] = {
                "raw_rows": raw_rows,
                "selected_rows": selected_rows,
                "invalid_date_rows": invalid_dates,
                "period_excluded_rows": max(
                    raw_rows - invalid_dates - selected_rows,
                    0,
                ),
            }
    return quality_by_dao


def file_sha256(path):
    """Compute a stable source-file checksum for provenance."""
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def historical_source_checksums():
    """Checksum every raw table consumed by the compiler."""
    cache_path = HISTORICAL_DIR / "source-checksums.json"
    cached = {}
    if cache_path.exists():
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            cached = {}

    cache_entries = {}
    checksums = {}
    for key, relative in {
        "market_daily": "market/market_daily.csv",
        "snapshot_proposals": "governance/snapshot_proposals.csv",
        "snapshot_votes": "governance/snapshot_votes.csv",
        "tally_proposals": "governance/tally_proposals.csv",
        "tally_votes": "governance/tally_votes.csv",
        "maker_polls": "governance/maker_polls.csv",
        "maker_poll_tallies": "governance/maker_poll_tallies.csv",
        "forum_topics": "forum/forum_topics.csv",
        "forum_posts": "forum/forum_posts.csv",
        "protocol_tvl": "protocol/protocol_tvl_daily.csv",
        "protocol_fees": "protocol/protocol_fees_daily.csv",
        "protocol_revenue": "protocol/protocol_revenue_daily.csv",
    }.items():
        source_path = HISTORICAL_DIR / relative
        if not source_path.exists():
            continue
        stat = source_path.stat()
        cached_entry = cached.get(key, {})
        if (
            cached_entry.get("path") == relative
            and cached_entry.get("size") == stat.st_size
            and cached_entry.get("mtime_ns") == stat.st_mtime_ns
            and cached_entry.get("sha256")
        ):
            checksum = cached_entry["sha256"]
        else:
            checksum = file_sha256(source_path)
        if checksum is not None:
            cache_entries[key] = {
                "path": relative,
                "sha256": checksum,
                "size": stat.st_size,
                "mtime_ns": stat.st_mtime_ns,
            }
            checksums[key] = {
                "path": relative,
                "sha256": checksum,
                "bytes": stat.st_size,
            }
    atomic_json_dump(cache_path, cache_entries)
    return checksums


# =============================================================================
# PROFILE COMPILATION PER DAO
# =============================================================================

def compile_voting_profile(dao_id, data):
    """Compile voting statistics from snapshot + tally data."""
    # Combine snapshot and tally proposals
    snap_props = data["snapshot_proposals"]
    tally_props = data["tally_proposals"]
    snap_votes = data["snapshot_votes"]
    tally_votes = data["tally_votes"]

    # Filter for this DAO
    if not snap_props.empty and "dao_id" in snap_props.columns:
        snap_props = snap_props[snap_props["dao_id"] == dao_id]
    else:
        snap_props = pd.DataFrame()

    if not tally_props.empty and "dao_id" in tally_props.columns:
        tally_props = tally_props[tally_props["dao_id"] == dao_id]
    else:
        tally_props = pd.DataFrame()

    if not snap_votes.empty and "dao_id" in snap_votes.columns:
        snap_votes = snap_votes[snap_votes["dao_id"] == dao_id]
    else:
        snap_votes = pd.DataFrame()

    if not tally_votes.empty and "dao_id" in tally_votes.columns:
        tally_votes = tally_votes[tally_votes["dao_id"] == dao_id]
    else:
        tally_votes = pd.DataFrame()

    total_proposals = len(snap_props) + len(tally_props)

    # Votes per proposal
    votes_per_proposal = []
    if not snap_votes.empty and "proposal_id" in snap_votes.columns:
        vpp = snap_votes.groupby("proposal_id").size()
        votes_per_proposal.extend(vpp.tolist())
    if not tally_votes.empty and "proposal_id" in tally_votes.columns:
        vpp = tally_votes.groupby("proposal_id").size()
        votes_per_proposal.extend(vpp.tolist())

    avg_votes_per_proposal = (
        float(sum(votes_per_proposal) / total_proposals)
        if total_proposals > 0 else None
    )

    # Voter concentration (Gini of voting power)
    voting_powers = []
    if not snap_votes.empty and "vp" in snap_votes.columns:
        snapshot_votes_clean = snap_votes.copy()
        snapshot_votes_clean["vp"] = pd.to_numeric(
            snapshot_votes_clean["vp"],
            errors="coerce",
        )
        snapshot_votes_clean = snapshot_votes_clean[
            snapshot_votes_clean["voter"].notna()
            & snapshot_votes_clean["vp"].notna()
            & (snapshot_votes_clean["vp"] >= 0)
        ]
        vp_by_voter = snapshot_votes_clean.groupby("voter")["vp"].sum()
        voting_powers.extend(vp_by_voter.tolist())
    if not tally_votes.empty and "weight" in tally_votes.columns:
        tally_votes_clean = tally_votes.copy()
        tally_votes_clean["weight"] = pd.to_numeric(tally_votes_clean["weight"], errors="coerce")
        tally_votes_clean = tally_votes_clean[
            tally_votes_clean["voter"].notna()
            & tally_votes_clean["weight"].notna()
            & (tally_votes_clean["weight"] >= 0)
        ]
        vp_by_voter = tally_votes_clean.groupby("voter")["weight"].sum()
        voting_powers.extend(vp_by_voter.tolist())

    voter_concentration = gini_coefficient(voting_powers) if voting_powers else None

    # Outcome rates use only proposals with classifiable outcomes.
    snapshot_outcomes = snapshot_binary_outcomes(snap_props, snap_votes)
    classified_outcomes = [outcome["passed"] for outcome in snapshot_outcomes]
    if not tally_props.empty and "status" in tally_props.columns:
        terminal_statuses = {
            "executed", "passed", "succeeded", "defeated", "failed",
        }
        for status in tally_props["status"].dropna().astype(str).str.lower():
            if status in terminal_statuses:
                classified_outcomes.append(status in {"executed", "passed", "succeeded"})
    approval_rate = (
        sum(classified_outcomes) / len(classified_outcomes)
        if classified_outcomes else None
    )

    # Avg for percentage from tally votes (on-chain) or snapshot votes (off-chain)
    for_shares = [outcome["for_share"] for outcome in snapshot_outcomes]
    avg_for_pct = float(np.mean(for_shares)) if for_shares else None
    if (
        not tally_votes.empty
        and "support" in tally_votes.columns
        and "weight" in tally_votes.columns
        and "proposal_id" in tally_votes.columns
    ):
        weighted_tally = tally_votes.copy()
        weighted_tally["_support"] = (
            weighted_tally["support"].astype(str).str.strip().str.lower()
        )
        weighted_tally["_weight"] = pd.to_numeric(
            weighted_tally["weight"],
            errors="coerce",
        )
        weighted_tally = weighted_tally[
            weighted_tally["_support"].isin(["for", "against"])
            & weighted_tally["_weight"].notna()
            & (weighted_tally["_weight"] >= 0)
        ]
        for _, proposal_votes in weighted_tally.groupby("proposal_id"):
            position_power = proposal_votes.groupby("_support")["_weight"].sum()
            for_power = float(position_power.get("for", 0.0))
            against_power = float(position_power.get("against", 0.0))
            if for_power + against_power > 0:
                for_shares.append(for_power / (for_power + against_power))
        avg_for_pct = float(np.mean(for_shares)) if for_shares else None

    # Participation rate estimation
    # We approximate using unique voters / total unique voters across all proposals
    all_voters = set()
    participation_rates = []

    if not snap_votes.empty and "voter" in snap_votes.columns:
        all_voters.update(snap_votes["voter"].dropna().unique())
    if not tally_votes.empty and "voter" in tally_votes.columns:
        all_voters.update(tally_votes["voter"].dropna().unique())

    if not snap_votes.empty and "voter" in snap_votes.columns:
        for _, grp in snap_votes.groupby("proposal_id"):
            participation_rates.append(len(grp["voter"].unique()) / max(len(all_voters), 1))

    if not tally_votes.empty and "voter" in tally_votes.columns:
        for _, grp in tally_votes.groupby("proposal_id"):
            participation_rates.append(len(grp["voter"].unique()) / max(len(all_voters), 1))

    avg_participation = float(np.mean(participation_rates)) if participation_rates else None
    participation_dist = participation_histogram(participation_rates) if participation_rates else []
    quorum_hit_rate = None
    if (
        not snap_props.empty
        and "scores_total" in snap_props.columns
        and "quorum" in snap_props.columns
    ):
        scores = pd.to_numeric(snap_props["scores_total"], errors="coerce")
        quorums = pd.to_numeric(snap_props["quorum"], errors="coerce")
        applicable = (quorums > 0) & scores.notna()
        if applicable.any():
            quorum_hit_rate = float((scores[applicable] >= quorums[applicable]).mean())

    return {
        "avg_participation_rate": round(avg_participation, 4) if avg_participation is not None else None,
        "participation_distribution": [round(p, 4) for p in participation_dist],
        "avg_votes_per_proposal": round(avg_votes_per_proposal, 2) if avg_votes_per_proposal is not None else None,
        "voter_concentration": round(voter_concentration, 4) if voter_concentration is not None else None,
        "approval_rate": round(approval_rate, 4) if approval_rate is not None else None,
        "avg_for_percentage": round(avg_for_pct, 4) if avg_for_pct is not None else None,
        "quorum_hit_rate": round(quorum_hit_rate, 4) if quorum_hit_rate is not None else None,
        # Neither Snapshot nor Tally vote exports contain delegation events.
        "delegation_rate": None,
    }


def compile_proposal_profile(dao_id, data, period=None):
    """Compile proposal dynamics from snapshot + tally proposals."""
    snap_props = data["snapshot_proposals"]
    tally_props = data["tally_proposals"]

    # Filter
    if not snap_props.empty and "dao_id" in snap_props.columns:
        snap_props = snap_props[snap_props["dao_id"] == dao_id]
    else:
        snap_props = pd.DataFrame()

    if not tally_props.empty and "dao_id" in tally_props.columns:
        tally_props = tally_props[tally_props["dao_id"] == dao_id]
    else:
        tally_props = pd.DataFrame()

    # Monthly counts
    monthly_counts_by_period = defaultdict(int)
    for df, date_col in [(snap_props, "created_iso"), (tally_props, "created_at")]:
        if not df.empty and date_col in df.columns:
            try:
                dates = pd.to_datetime(df[date_col], errors="coerce")
                months = dates.dt.tz_localize(None).dt.to_period("M")
                monthly = months.value_counts().sort_index()
                for month, count in monthly.items():
                    if not pd.isna(month):
                        monthly_counts_by_period[month] += int(count)
            except Exception:
                pass

    complete_months = full_month_index(period)
    if complete_months is not None:
        monthly_counts = [monthly_counts_by_period.get(month, 0) for month in complete_months]
    else:
        monthly_counts = [
            monthly_counts_by_period[month]
            for month in sorted(monthly_counts_by_period)
        ]
    avg_per_month = float(np.mean(monthly_counts)) if monthly_counts else None

    # Voting period
    voting_periods = []
    for df, start_col, end_col in [
        (snap_props, "start_at", "end_at"),
        (tally_props, "start_at", "end_at"),
    ]:
        if not df.empty and start_col in df.columns and end_col in df.columns:
            try:
                starts = pd.to_datetime(df[start_col], errors="coerce", unit="s" if df[start_col].dtype in ["int64", "float64"] else None)
                ends = pd.to_datetime(df[end_col], errors="coerce", unit="s" if df[end_col].dtype in ["int64", "float64"] else None)
                durations = (ends - starts).dt.total_seconds() / 86400  # days
                durations = durations.dropna()
                durations = durations[(durations > 0) & (durations < 90)]
                voting_periods.extend(durations.tolist())
            except Exception:
                pass

    avg_voting_period = float(np.mean(voting_periods)) if voting_periods else None

    # Choices per proposal (from snapshot)
    choice_counts = []
    if not snap_props.empty and "choices" in snap_props.columns:
        for raw_choices in snap_props["choices"].dropna():
            try:
                choices = json.loads(raw_choices) if isinstance(raw_choices, str) else raw_choices
                if isinstance(choices, list):
                    choice_counts.append(len(choices))
            except (TypeError, ValueError, json.JSONDecodeError):
                continue
    avg_choices = float(np.mean(choice_counts)) if choice_counts else None

    # Pass rate is restricted to classifiable Snapshot binaries and terminal Tally outcomes.
    snapshot_outcomes = snapshot_binary_outcomes(
        snap_props,
        data["snapshot_votes"][
            data["snapshot_votes"]["dao_id"] == dao_id
        ] if not data["snapshot_votes"].empty else pd.DataFrame(),
    )
    outcomes = [outcome["passed"] for outcome in snapshot_outcomes]
    if not tally_props.empty and "status" in tally_props.columns:
        terminal_statuses = {
            "executed", "passed", "succeeded", "defeated", "failed",
        }
        for status in tally_props["status"].dropna().astype(str).str.lower():
            if status in terminal_statuses:
                outcomes.append(status in {"executed", "passed", "succeeded"})
    pass_rate = sum(outcomes) / len(outcomes) if outcomes else None

    # Proposal types (from title keywords)
    type_counts = defaultdict(int)
    for df in [snap_props, tally_props]:
        if not df.empty and "title" in df.columns:
            for title in df["title"].dropna():
                title_lower = title.lower()
                if any(k in title_lower for k in ["temp check", "temperature", "arfc"]):
                    type_counts["temperature_check"] += 1
                elif any(k in title_lower for k in ["upgrade", "update", "parameter"]):
                    type_counts["parameter_change"] += 1
                elif any(k in title_lower for k in ["fund", "grant", "budget", "spend"]):
                    type_counts["funding"] += 1
                elif any(k in title_lower for k in ["add", "list", "onboard", "deploy"]):
                    type_counts["onboarding"] += 1
                else:
                    type_counts["governance"] += 1

    # Normalize type counts
    type_total = sum(type_counts.values()) or 1
    proposal_types = {k: round(v / type_total, 4) for k, v in type_counts.items()}

    return {
        "avg_proposals_per_month": round(avg_per_month, 2) if avg_per_month is not None else None,
        "proposal_types": proposal_types,
        "avg_voting_period_days": round(avg_voting_period, 2) if avg_voting_period is not None else None,
        "avg_choices_per_proposal": round(avg_choices, 2) if avg_choices is not None else None,
        "pass_rate": round(pass_rate, 4) if pass_rate is not None else None,
        "monthly_cadence": [round(c, 2) for c in monthly_counts[-12:]],  # Last 12 months
    }


def compile_market_profile(dao_id, data):
    """Compile market dynamics from daily price data."""
    df = data["market_daily"]
    if df.empty or "dao_id" not in df.columns:
        logger.warning("Skipping market profile for %s: no market_daily data available", dao_id)
        return None

    dao_data = df[df["dao_id"] == dao_id].copy()
    if dao_data.empty:
        logger.warning("Skipping market profile for %s: no rows match dao_id", dao_id)
        return None

    dao_data["price_usd"] = pd.to_numeric(dao_data["price_usd"], errors="coerce")
    dao_data = dao_data.dropna(subset=["price_usd"])
    dao_data = dao_data.sort_values("timestamp_utc")

    dao_data = dao_data[dao_data["price_usd"] > 0]
    prices = dao_data["price_usd"].values
    if len(prices) < 2:
        return None

    # Daily returns
    returns = np.diff(np.log(prices))
    returns = returns[np.isfinite(returns)]
    if len(returns) == 0:
        logger.warning("Skipping market profile for %s: no valid price returns", dao_id)
        return None

    avg_daily_return = float(np.mean(returns))
    daily_volatility = float(np.std(returns))

    # Market cap and volume
    market_caps = pd.to_numeric(dao_data.get("market_cap_usd", pd.Series()), errors="coerce").dropna()
    volumes = pd.to_numeric(dao_data.get("volume_usd", pd.Series()), errors="coerce").dropna()

    # Drawdown events
    drawdowns = detect_drawdowns(prices.tolist())

    return {
        "avg_daily_return": round(avg_daily_return, 6),
        "daily_volatility": round(daily_volatility, 6),
        "avg_price_usd": round(float(np.mean(prices)), 4),
        "price_range": [round(float(np.min(prices)), 4), round(float(np.max(prices)), 4)],
        "avg_market_cap": round(float(market_caps.mean()), 2) if len(market_caps) > 0 else None,
        "avg_daily_volume": round(float(volumes.mean()), 2) if len(volumes) > 0 else None,
        # The raw corpus contains DAO-token series but no independently sourced
        # ETH benchmark. Do not manufacture a correlation.
        "correlation_to_eth": None,
        "drawdown_events": drawdowns[:10],  # Cap at 10 events
    }


def compile_forum_profile(dao_id, data, period=None):
    """Compile forum activity metrics."""
    topics = data["forum_topics"]
    posts = data["forum_posts"]

    if topics.empty or "dao_id" not in topics.columns:
        logger.warning("Skipping forum profile for %s: no forum_topics data available", dao_id)
        return None

    dao_topics = topics[topics["dao_id"] == dao_id]
    dao_posts = posts[posts["dao_id"] == dao_id] if not posts.empty and "dao_id" in posts.columns else pd.DataFrame()

    if dao_topics.empty:
        logger.warning("Skipping forum profile for %s: no forum topics match dao_id", dao_id)
        return None

    # Topics per month
    avg_topics_per_month = None
    try:
        topic_dates = pd.to_datetime(dao_topics["created_at"], errors="coerce")
        topic_months = topic_dates.dt.tz_localize(None).dt.to_period("M")
        monthly_topics = topic_months.value_counts()
        complete_months = full_month_index(period)
        if complete_months is not None:
            monthly_topics = monthly_topics.reindex(complete_months, fill_value=0)
        avg_topics_per_month = float(monthly_topics.mean())
    except (KeyError, TypeError, ValueError, AttributeError):
        pass

    # Posts per topic
    posts_count = pd.to_numeric(dao_topics.get("posts_count", pd.Series()), errors="coerce").dropna()
    avg_posts_per_topic = float(posts_count.mean()) if len(posts_count) > 0 else None

    # Views per topic
    views = pd.to_numeric(dao_topics.get("views", pd.Series()), errors="coerce").dropna()
    avg_views_per_topic = float(views.mean()) if len(views) > 0 else None

    # Top categories (from topic slugs/titles)
    categories = defaultdict(int)
    if "title" in dao_topics.columns:
        for title in dao_topics["title"].dropna():
            title_lower = title.lower()
            if any(k in title_lower for k in ["temp check", "arfc", "rfc"]):
                categories["proposal_discussion"] += 1
            elif any(k in title_lower for k in ["grant", "fund", "budget"]):
                categories["funding"] += 1
            elif any(k in title_lower for k in ["governance", "vote", "delegation"]):
                categories["governance"] += 1
            elif any(k in title_lower for k in ["bug", "security", "audit"]):
                categories["technical"] += 1
            else:
                categories["general"] += 1

    cat_total = sum(categories.values()) or 1
    top_categories = {k: round(v / cat_total, 4) for k, v in sorted(
        categories.items(), key=lambda x: -x[1]
    )[:10]}

    # Post analysis
    avg_post_length = None
    reply_rate = None
    if not dao_posts.empty:
        if "raw" in dao_posts.columns:
            lengths = dao_posts["raw"].dropna().apply(len)
            avg_post_length = int(lengths.mean()) if len(lengths) > 0 else None

        if "reply_to_post_number" in dao_posts.columns:
            replies = dao_posts["reply_to_post_number"].notna().sum()
            reply_rate = replies / max(len(dao_posts), 1)

    # Sentiment keywords (simple frequency from post content)
    sentiment_keywords = {}
    if not dao_posts.empty and "raw" in dao_posts.columns:
        positive_words = ["support", "agree", "great", "excellent", "approve", "yes"]
        negative_words = ["oppose", "disagree", "concern", "risk", "against", "no"]
        all_text = " ".join(dao_posts["raw"].dropna().str.lower())
        for w in positive_words:
            count = all_text.count(w)
            if count > 0:
                sentiment_keywords[w] = count
        for w in negative_words:
            count = all_text.count(w)
            if count > 0:
                sentiment_keywords[w] = count

    return {
        "avg_topics_per_month": round(avg_topics_per_month, 2) if avg_topics_per_month is not None else None,
        "avg_posts_per_topic": round(avg_posts_per_topic, 2) if avg_posts_per_topic is not None else None,
        "avg_views_per_topic": round(avg_views_per_topic, 2) if avg_views_per_topic is not None else None,
        "top_categories": top_categories,
        "avg_post_length_chars": avg_post_length,
        "reply_rate": round(reply_rate, 4) if reply_rate is not None else None,
        "sentiment_keywords": sentiment_keywords,
    }


def compile_voter_clusters(dao_id, data):
    """Cluster voters into archetypes based on voting behavior."""
    snap_votes = data["snapshot_votes"]
    tally_votes = data["tally_votes"]

    # Collect per-voter stats. Alignment is record-weighted within voters:
    # each comparable vote is compared with that proposal's voting-power
    # weighted modal position.
    voter_stats = {}

    sources = [
        ("snapshot", snap_votes, "vp", "choice"),
        ("tally", tally_votes, "weight", "support"),
    ]
    total_proposal_ids = set()
    for source_name, proposals_key in (
        ("snapshot", "snapshot_proposals"),
        ("tally", "tally_proposals"),
    ):
        proposals = data[proposals_key]
        if proposals.empty or "dao_id" not in proposals.columns:
            continue
        dao_proposals = proposals[proposals["dao_id"] == dao_id]
        if "proposal_id" in dao_proposals.columns:
            total_proposal_ids.update(
                f"{source_name}:{proposal_id}"
                for proposal_id in dao_proposals["proposal_id"].dropna().unique()
            )
    for source_name, votes_df, vp_col, position_col in sources:
        if votes_df.empty or "dao_id" not in votes_df.columns:
            continue
        dao_votes = votes_df[votes_df["dao_id"] == dao_id]
        if dao_votes.empty:
            continue
        dao_votes = dao_votes.copy()
        dao_votes[vp_col] = pd.to_numeric(
            dao_votes.get(vp_col), errors="coerce"
        )
        dao_votes["_position"] = dao_votes.get(position_col, pd.Series(index=dao_votes.index)).map(
            lambda value: (
                str(int(float(value)))
                if source_name == "snapshot"
                and pd.notna(value)
                and str(value).strip().replace(".", "", 1).isdigit()
                else str(value).strip().lower()
            )
        )
        dao_votes = dao_votes[
            dao_votes["voter"].notna()
            & dao_votes["proposal_id"].notna()
            & dao_votes[vp_col].notna()
            & (dao_votes[vp_col] >= 0)
            & (dao_votes["_position"] != "")
            & (dao_votes["_position"] != "nan")
        ]
        total_proposal_ids.update(
            f"{source_name}:{proposal_id}"
            for proposal_id in dao_votes["proposal_id"].unique()
        )

        # Count proposals per voter (vectorized)
        proposals_per_voter = dao_votes.groupby("voter")["proposal_id"].nunique()

        # Sum voting power per voter (vectorized)
        vp_per_voter = dao_votes.groupby("voter")[vp_col].sum()

        alignment_by_voter = defaultdict(lambda: {"aligned": 0, "comparable": 0})
        for _, proposal_votes in dao_votes.groupby("proposal_id"):
            position_power = proposal_votes.groupby("_position")[vp_col].sum()
            if position_power.empty or position_power.max() <= 0:
                continue
            leaders = position_power[position_power == position_power.max()].index.tolist()
            if len(leaders) != 1:
                continue
            majority_position = leaders[0]
            for _, vote in proposal_votes.iterrows():
                voter = vote["voter"]
                alignment_by_voter[voter]["comparable"] += 1
                alignment_by_voter[voter]["aligned"] += int(
                    vote["_position"] == majority_position
                )

        for voter, prop_count in proposals_per_voter.items():
            if voter not in voter_stats:
                voter_stats[voter] = {
                    "vote_count": 0,
                    "total_vp": 0.0,
                    "proposals_voted": 0,
                    "aligned": 0,
                    "comparable": 0,
                }
            voter_stats[voter]["vote_count"] += int(prop_count)
            voter_stats[voter]["proposals_voted"] += int(prop_count)
            if voter in vp_per_voter.index:
                voter_stats[voter]["total_vp"] += float(vp_per_voter[voter])
            voter_stats[voter]["aligned"] += alignment_by_voter[voter]["aligned"]
            voter_stats[voter]["comparable"] += alignment_by_voter[voter]["comparable"]

    if not voter_stats:
        return []

    total_voters = len(voter_stats)
    total_proposals_count = len(total_proposal_ids)

    # Classify voters
    clusters = {
        label: {
            "count": 0,
            "total_vp": 0,
            "total_participation": 0,
            "aligned": 0,
            "comparable": 0,
        }
        for label in ("whale", "active_delegate", "regular_voter", "passive_holder")
    }

    # Sort by voting power to find whales
    sorted_voters = sorted(voter_stats.items(), key=lambda x: -x[1]["total_vp"])
    whale_count = max(1, math.ceil(total_voters * 0.10))

    for i, (voter, stats) in enumerate(sorted_voters):
        participation = stats["proposals_voted"] / total_proposals_count

        if i < whale_count:
            label = "whale"
        elif participation > 0.5:  # Votes on >50% of proposals
            label = "active_delegate"
        elif participation > 0.1:  # Votes on >10% of proposals
            label = "regular_voter"
        else:
            label = "passive_holder"

        clusters[label]["count"] += 1
        clusters[label]["total_vp"] += stats["total_vp"]
        clusters[label]["total_participation"] += participation
        clusters[label]["aligned"] += stats["aligned"]
        clusters[label]["comparable"] += stats["comparable"]

    result = []
    for label, c in clusters.items():
        if c["count"] == 0:
            continue
        result.append({
            "label": label,
            "share": round(c["count"] / total_voters, 4),
            "avg_voting_power": round(c["total_vp"] / c["count"], 4),
            "participation_rate": round(c["total_participation"] / c["count"], 4),
            "alignment_with_majority": (
                round(c["aligned"] / c["comparable"], 4)
                if c["comparable"] > 0 else None
            ),
        })

    return result


def compile_protocol_profile(dao_id, data):
    """Compile protocol/treasury metrics from DeFiLlama data."""
    tvl_df = data["protocol_tvl"]
    fees_df = data["protocol_fees"]
    revenue_df = data["protocol_revenue"]

    result = {}

    if not tvl_df.empty and "dao_id" in tvl_df.columns:
        dao_tvl = tvl_df[tvl_df["dao_id"] == dao_id].copy()
        if not dao_tvl.empty and "tvl_usd" in dao_tvl.columns:
            if "timestamp_iso" in dao_tvl.columns:
                dao_tvl["_timestamp"] = pd.to_datetime(
                    dao_tvl["timestamp_iso"],
                    errors="coerce",
                    utc=True,
                )
                dao_tvl = dao_tvl.sort_values("_timestamp")
            tvl_values = pd.to_numeric(
                dao_tvl["tvl_usd"],
                errors="coerce",
            ).dropna()
            tvl_values = tvl_values[tvl_values >= 0]
            if len(tvl_values) > 0:
                result["avg_tvl"] = round(float(tvl_values.mean()), 2)
                result["tvl_trend"] = tvl_trend(tvl_values.values)

    if not fees_df.empty and "dao_id" in fees_df.columns:
        dao_fees = fees_df[fees_df["dao_id"] == dao_id]
        if not dao_fees.empty and "fees_usd" in dao_fees.columns:
            fees_values = pd.to_numeric(dao_fees["fees_usd"], errors="coerce").dropna()
            if len(fees_values) > 0:
                result["avg_daily_fees"] = round(float(fees_values.mean()), 2)

    if not revenue_df.empty and "dao_id" in revenue_df.columns:
        dao_rev = revenue_df[revenue_df["dao_id"] == dao_id]
        if not dao_rev.empty and "revenue_usd" in dao_rev.columns:
            rev_values = pd.to_numeric(dao_rev["revenue_usd"], errors="coerce").dropna()
            if len(rev_values) > 0:
                result["avg_daily_revenue"] = round(float(rev_values.mean()), 2)

    if not result:
        return None
    result.setdefault("avg_tvl", None)
    result.setdefault("tvl_trend", None)
    result.setdefault("avg_daily_fees", None)
    result.setdefault("avg_daily_revenue", None)
    return result


# =============================================================================
# MAIN COMPILATION
# =============================================================================

def compile_profile(dao_id, data, metadata=None):
    """Compile full CalibrationProfile for a single DAO."""
    print(f"  Compiling profile for: {dao_id}")

    voting = compile_voting_profile(dao_id, data)
    period = (metadata or {}).get("period")
    proposals = compile_proposal_profile(dao_id, data, period)
    market = compile_market_profile(dao_id, data)
    forum = compile_forum_profile(dao_id, data, period)
    voter_clusters = compile_voter_clusters(dao_id, data)
    protocol = compile_protocol_profile(dao_id, data)

    def availability(value, observed_reason, unavailable_reason, status="derived"):
        return {
            "status": status if value is not None else "unavailable",
            "reason": observed_reason if value is not None else unavailable_reason,
        }

    profile_metadata = dict(metadata or {})
    field_quality = {
        "voting.avg_participation_rate": availability(
            voting["avg_participation_rate"],
            "Derived from unique voters per proposal over the observed voter universe.",
            "No proposal-level vote participation observations were available.",
        ),
        "voting.avg_votes_per_proposal": availability(
            voting["avg_votes_per_proposal"],
            "Derived over all observed proposals, including proposals with zero recorded votes.",
            "No proposals were observed.",
        ),
        "voting.voter_concentration": availability(
            voting["voter_concentration"],
            "Derived as the Gini coefficient of cumulative observed voting power by voter.",
            "No usable voter-power observations were available.",
        ),
        "voting.approval_rate": availability(
            voting["approval_rate"],
            "Derived from classifiable binary Snapshot outcomes and terminal Tally outcomes.",
            "No classifiable terminal proposal outcomes were available.",
        ),
        "voting.avg_for_percentage": availability(
            voting["avg_for_percentage"],
            "Derived from classifiable vote positions.",
            "No classifiable vote-position observations were available.",
        ),
        "voting.quorum_hit_rate": availability(
            voting["quorum_hit_rate"],
            "Derived over Snapshot proposals with a positive reported quorum.",
            "No proposals with an applicable reported quorum were available.",
        ),
        "voting.delegation_rate": {
            "status": "unavailable",
            "reason": "Snapshot and Tally vote exports do not contain delegation events.",
        },
        "proposals.avg_proposals_per_month": availability(
            proposals["avg_proposals_per_month"],
            "Derived over every calendar month in the declared partition, including zero-count months.",
            "No valid proposal dates or declared evaluation period were available.",
        ),
        "proposals.avg_voting_period_days": availability(
            proposals["avg_voting_period_days"],
            "Derived from valid positive proposal start-to-end durations below 90 days.",
            "No valid proposal voting-period observations were available.",
        ),
        "proposals.avg_choices_per_proposal": availability(
            proposals["avg_choices_per_proposal"],
            "Derived from successfully parsed Snapshot choice arrays.",
            "No valid Snapshot choice arrays were available.",
        ),
        "proposals.pass_rate": availability(
            proposals["pass_rate"],
            "Derived from classifiable binary Snapshot outcomes and terminal Tally outcomes.",
            "No classifiable terminal proposal outcomes were available.",
        ),
        "market": availability(
            market,
            "Observed from at least two positive token-price records with a valid log return.",
            "No usable positive token-price return series was available.",
            "observed",
        ),
        "market.avg_market_cap": availability(
            market["avg_market_cap"] if market is not None else None,
            "Derived from observed finite market-cap records.",
            "No finite market-cap observations were available.",
        ),
        "market.avg_daily_volume": availability(
            market["avg_daily_volume"] if market is not None else None,
            "Derived from observed finite daily-volume records.",
            "No finite daily-volume observations were available.",
        ),
        "market.correlation_to_eth": {
            "status": "unavailable" if market is not None else "not_applicable",
            "reason": "The source corpus has no independently sourced ETH benchmark.",
        },
        "forum": availability(
            forum,
            "Observed from forum-topic records for this DAO and partition.",
            "No forum-topic records were available for this DAO and partition.",
            "observed",
        ),
        "forum.avg_topics_per_month": availability(
            forum["avg_topics_per_month"] if forum is not None else None,
            "Derived over every calendar month in the declared partition, including zero-count months.",
            "No valid forum-topic dates or declared evaluation period were available.",
        ),
        "forum.avg_posts_per_topic": availability(
            forum["avg_posts_per_topic"] if forum is not None else None,
            "Derived from observed topic post counts.",
            "No usable topic post-count observations were available.",
        ),
        "forum.avg_views_per_topic": availability(
            forum["avg_views_per_topic"] if forum is not None else None,
            "Derived from observed topic view counts.",
            "No usable topic view-count observations were available.",
        ),
        "forum.avg_post_length_chars": availability(
            forum["avg_post_length_chars"] if forum is not None else None,
            "Derived from observed non-null raw forum-post text.",
            "No usable raw forum-post text was available.",
        ),
        "forum.reply_rate": availability(
            forum["reply_rate"] if forum is not None else None,
            "Derived as replies divided by observed forum posts.",
            "No forum posts with reply metadata were available.",
        ),
        "voter_clusters.alignment_with_majority": {
            "status": (
                "derived"
                if any(
                    cluster["alignment_with_majority"] is not None
                    for cluster in voter_clusters
                )
                else "unavailable"
            ),
            "reason": (
                "Derived by comparing each comparable vote with the proposal's "
                "voting-power-weighted modal position."
                if any(
                    cluster["alignment_with_majority"] is not None
                    for cluster in voter_clusters
                )
                else "No comparable vote records were available."
            ),
        },
        "protocol": {
            "status": "observed" if protocol is not None else "unavailable",
            "reason": (
                "At least one protocol series was observed."
                if protocol is not None
                else "No protocol series was observed for this DAO and period."
            ),
        },
    }
    profile_metadata["field_quality"] = field_quality

    profile = {
        "dao_id": dao_id,
        "calibration_metadata": profile_metadata,
        "voting": voting,
        "proposals": proposals,
        "market": market,
        "forum": forum,
        "voter_clusters": voter_clusters,
        "protocol": protocol,
    }

    # Log which sections are missing
    missing = [k for k in ("voting", "proposals", "market", "forum", "protocol") if profile[k] is None]
    if missing:
        logger.info("Profile for %s is missing sections: %s", dao_id, ", ".join(missing))

    return profile


def get_all_dao_ids(data):
    """Discover all DAO IDs present in the data."""
    dao_ids = set()
    for key, df in data.items():
        if not df.empty and "dao_id" in df.columns:
            dao_ids.update(df["dao_id"].unique())
    return sorted(dao_ids)


def main():
    parser = argparse.ArgumentParser(description="Compile DAO calibration profiles from historical data")
    parser.add_argument("--dao", type=str, help="Compile only for specific DAO ID")
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR),
                        help="Output directory for JSON profiles")
    parser.add_argument("--list", action="store_true", help="List available DAO IDs and exit")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    parser.add_argument("--start-date", type=str, help="Inclusive UTC start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, help="Inclusive UTC end date (YYYY-MM-DD)")
    parser.add_argument("--label", type=str, default="aggregate", help="Dataset partition label")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(levelname)s: %(message)s",
    )

    print("Loading historical data...")
    raw_data = load_all_data()
    data = filter_data_by_period(raw_data, args.start_date, args.end_date)

    # Check what data is available
    for key, df in data.items():
        if not df.empty:
            print(f"  {key}: {len(df)} rows")

    # Discover DAO IDs
    all_dao_ids = get_all_dao_ids(data)
    quality_by_dao = source_quality_index(raw_data, data, all_dao_ids)
    print(f"\nFound {len(all_dao_ids)} DAOs: {', '.join(all_dao_ids)}")

    if args.list:
        return

    # Filter to specific DAO if requested
    dao_ids = [args.dao] if args.dao else all_dao_ids

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Compile profiles
    print(f"\nCompiling calibration profiles...")
    compiled = 0
    checksums = historical_source_checksums()
    for dao_id in dao_ids:
        try:
            dao_data = {
                key: (
                    frame[frame["dao_id"] == dao_id].copy()
                    if not frame.empty and "dao_id" in frame.columns
                    else frame
                )
                for key, frame in data.items()
            }
            metadata = {
                "schema_version": "1.1.0",
                "partition": args.label,
                "period": {
                    "start": args.start_date,
                    "end": args.end_date,
                    "inclusive": True,
                },
                "source_manifest": source_manifest(dao_data),
                "source_quality": quality_by_dao.get(dao_id, {}),
                "source_checksums": checksums,
                "method": "chronological-source-filter",
            }
            profile = compile_profile(dao_id, dao_data, metadata)
            output_path = output_dir / f"{dao_id}_profile.json"
            atomic_json_dump(output_path, profile)
            print(f"    -> Saved: {output_path}")
            compiled += 1
        except Exception as e:
            print(f"    ERROR compiling {dao_id}: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()

    print(f"\nDone! Compiled {compiled}/{len(dao_ids)} profiles to {output_dir}")


if __name__ == "__main__":
    main()
