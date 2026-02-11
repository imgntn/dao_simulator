#!/usr/bin/env python3
"""
Calibration Profile Compiler

Reads historical CSVs from results/historical/ and computes per-DAO
CalibrationProfile JSON files used by the simulator's digital twin system.

Usage:
    python compile_calibration.py [--dao DAO_ID] [--output-dir DIR]
"""

import argparse
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

logger = logging.getLogger(__name__)


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def safe_float(val, default=0.0):
    """Convert value to float safely."""
    try:
        f = float(val)
        return f if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


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
        return "stable"
    # Compare first quarter average to last quarter average
    q_len = len(tvl_series) // 4
    first_q = np.mean(tvl_series[:q_len])
    last_q = np.mean(tvl_series[-q_len:])
    if first_q == 0:
        return "stable"
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

    avg_votes_per_proposal = float(np.mean(votes_per_proposal)) if votes_per_proposal else 0

    # Voter concentration (Gini of voting power)
    voting_powers = []
    if not snap_votes.empty and "vp" in snap_votes.columns:
        vp_by_voter = snap_votes.groupby("voter")["vp"].sum()
        voting_powers.extend(vp_by_voter.tolist())
    if not tally_votes.empty and "weight" in tally_votes.columns:
        tally_votes_clean = tally_votes.copy()
        tally_votes_clean["weight"] = pd.to_numeric(tally_votes_clean["weight"], errors="coerce")
        vp_by_voter = tally_votes_clean.groupby("voter")["weight"].sum()
        voting_powers.extend(vp_by_voter.tolist())

    voter_concentration = gini_coefficient(voting_powers) if voting_powers else 0.5

    # Approval rate from snapshot
    approval_rate = 0.5
    if not snap_props.empty and "state" in snap_props.columns:
        closed = snap_props[snap_props["state"] == "closed"]
        if len(closed) > 0:
            # Most snapshot proposals that close are considered "passed"
            approval_rate = len(closed) / max(len(snap_props), 1)

    # Tally approval rate (proposals with status 'executed' or 'passed')
    if not tally_props.empty and "status" in tally_props.columns:
        passed = tally_props[tally_props["status"].isin(["executed", "passed", "succeeded"])]
        tally_approval_rate = len(passed) / max(len(tally_props), 1)
        # Blend with snapshot rate
        if approval_rate > 0:
            approval_rate = (approval_rate + tally_approval_rate) / 2
        else:
            approval_rate = tally_approval_rate

    # Avg for percentage from tally votes
    avg_for_pct = 0.65
    if not tally_votes.empty and "support" in tally_votes.columns:
        for_votes = tally_votes[tally_votes["support"] == "for"]
        if len(tally_votes) > 0:
            avg_for_pct = len(for_votes) / len(tally_votes)

    # Participation rate estimation
    # We approximate using unique voters / total unique voters across all proposals
    all_voters = set()
    participation_rates = []

    if not snap_votes.empty and "voter" in snap_votes.columns:
        all_voters.update(snap_votes["voter"].unique())
        for _, grp in snap_votes.groupby("proposal_id"):
            participation_rates.append(len(grp["voter"].unique()) / max(len(all_voters), 1))

    if not tally_votes.empty and "voter" in tally_votes.columns:
        all_voters.update(tally_votes["voter"].unique())
        for _, grp in tally_votes.groupby("proposal_id"):
            participation_rates.append(len(grp["voter"].unique()) / max(len(all_voters), 1))

    avg_participation = float(np.mean(participation_rates)) if participation_rates else 0.15
    participation_dist = participation_histogram(participation_rates) if participation_rates else [0.1] * 10

    return {
        "avg_participation_rate": round(avg_participation, 4),
        "participation_distribution": [round(p, 4) for p in participation_dist],
        "avg_votes_per_proposal": round(avg_votes_per_proposal, 2),
        "voter_concentration": round(voter_concentration, 4),
        "approval_rate": round(approval_rate, 4),
        "avg_for_percentage": round(avg_for_pct, 4),
        "quorum_hit_rate": round(min(approval_rate * 1.1, 1.0), 4),  # Approximation
        "delegation_rate": 0.0,  # Would need delegation data
    }


def compile_proposal_profile(dao_id, data):
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
    monthly_counts = []
    for df, date_col in [(snap_props, "created_iso"), (tally_props, "created_at")]:
        if not df.empty and date_col in df.columns:
            try:
                dates = pd.to_datetime(df[date_col], errors="coerce")
                months = dates.dt.to_period("M")
                monthly = months.value_counts().sort_index()
                monthly_counts.extend(monthly.tolist())
            except Exception:
                pass

    avg_per_month = float(np.mean(monthly_counts)) if monthly_counts else 2.0

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

    avg_voting_period = float(np.mean(voting_periods)) if voting_periods else 7.0

    # Choices per proposal (from snapshot)
    avg_choices = 3.0
    if not snap_props.empty and "choices" in snap_props.columns:
        try:
            choice_counts = snap_props["choices"].apply(
                lambda x: len(json.loads(x)) if isinstance(x, str) else 3
            )
            avg_choices = float(choice_counts.mean())
        except Exception:
            pass

    # Pass rate (same as approval rate, computed from both sources)
    total = len(snap_props) + len(tally_props)
    passed = 0
    if not snap_props.empty and "state" in snap_props.columns:
        passed += len(snap_props[snap_props["state"] == "closed"])
    if not tally_props.empty and "status" in tally_props.columns:
        passed += len(tally_props[tally_props["status"].isin(["executed", "passed", "succeeded"])])
    pass_rate = passed / max(total, 1)

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
        "avg_proposals_per_month": round(avg_per_month, 2),
        "proposal_types": proposal_types,
        "avg_voting_period_days": round(avg_voting_period, 2),
        "avg_choices_per_proposal": round(avg_choices, 2),
        "pass_rate": round(pass_rate, 4),
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

    prices = dao_data["price_usd"].values
    if len(prices) < 2:
        return None

    # Daily returns
    returns = np.diff(np.log(prices[prices > 0]))
    returns = returns[np.isfinite(returns)]

    avg_daily_return = float(np.mean(returns)) if len(returns) > 0 else 0.0
    daily_volatility = float(np.std(returns)) if len(returns) > 0 else 0.02

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
        "avg_market_cap": round(float(market_caps.mean()), 2) if len(market_caps) > 0 else 0,
        "avg_daily_volume": round(float(volumes.mean()), 2) if len(volumes) > 0 else 0,
        "correlation_to_eth": 0.5,  # Placeholder - would need ETH price data
        "drawdown_events": drawdowns[:10],  # Cap at 10 events
    }


def compile_forum_profile(dao_id, data):
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
    try:
        topic_dates = pd.to_datetime(dao_topics["created_at"], errors="coerce")
        topic_months = topic_dates.dt.to_period("M")
        monthly_topics = topic_months.value_counts()
        avg_topics_per_month = float(monthly_topics.mean())
    except Exception:
        avg_topics_per_month = 5.0

    # Posts per topic
    posts_count = pd.to_numeric(dao_topics.get("posts_count", pd.Series()), errors="coerce").dropna()
    avg_posts_per_topic = float(posts_count.mean()) if len(posts_count) > 0 else 3.0

    # Views per topic
    views = pd.to_numeric(dao_topics.get("views", pd.Series()), errors="coerce").dropna()
    avg_views_per_topic = float(views.mean()) if len(views) > 0 else 100.0

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
    avg_post_length = 500
    reply_rate = 0.6
    if not dao_posts.empty:
        if "raw" in dao_posts.columns:
            lengths = dao_posts["raw"].dropna().apply(len)
            avg_post_length = int(lengths.mean()) if len(lengths) > 0 else 500

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
        "avg_topics_per_month": round(avg_topics_per_month, 2),
        "avg_posts_per_topic": round(avg_posts_per_topic, 2),
        "avg_views_per_topic": round(avg_views_per_topic, 2),
        "top_categories": top_categories,
        "avg_post_length_chars": avg_post_length,
        "reply_rate": round(reply_rate, 4),
        "sentiment_keywords": sentiment_keywords,
    }


def compile_voter_clusters(dao_id, data):
    """Cluster voters into archetypes based on voting behavior."""
    snap_votes = data["snapshot_votes"]
    tally_votes = data["tally_votes"]

    # Collect per-voter stats
    voter_stats = {}

    for votes_df, vp_col in [(snap_votes, "vp"), (tally_votes, "weight")]:
        if votes_df.empty or "dao_id" not in votes_df.columns:
            continue
        dao_votes = votes_df[votes_df["dao_id"] == dao_id]
        if dao_votes.empty:
            continue

        # Count proposals per voter (vectorized)
        proposals_per_voter = dao_votes.groupby("voter")["proposal_id"].nunique()

        # Sum voting power per voter (vectorized)
        vp_per_voter = pd.Series(dtype=float)
        if vp_col in dao_votes.columns:
            dao_votes_copy = dao_votes.copy()
            dao_votes_copy[vp_col] = pd.to_numeric(dao_votes_copy[vp_col], errors="coerce")
            vp_per_voter = dao_votes_copy.groupby("voter")[vp_col].sum()

        for voter, prop_count in proposals_per_voter.items():
            if voter not in voter_stats:
                voter_stats[voter] = {"vote_count": 0, "total_vp": 0.0, "proposals_voted": 0}
            voter_stats[voter]["vote_count"] += int(prop_count)
            voter_stats[voter]["proposals_voted"] += int(prop_count)
            if voter in vp_per_voter.index:
                voter_stats[voter]["total_vp"] += float(vp_per_voter[voter])

    if not voter_stats:
        return _default_voter_clusters()

    total_voters = len(voter_stats)
    total_proposals_count = max(
        max((v["proposals_voted"] for v in voter_stats.values()), default=1),
        1
    )

    # Classify voters
    clusters = {
        "whale": {"count": 0, "total_vp": 0, "total_participation": 0},
        "active_delegate": {"count": 0, "total_vp": 0, "total_participation": 0},
        "regular_voter": {"count": 0, "total_vp": 0, "total_participation": 0},
        "passive_holder": {"count": 0, "total_vp": 0, "total_participation": 0},
    }

    # Sort by voting power to find whales
    sorted_voters = sorted(voter_stats.items(), key=lambda x: -x[1]["total_vp"])
    vp_values = [v["total_vp"] for _, v in sorted_voters]
    total_vp = sum(vp_values) or 1

    for i, (voter, stats) in enumerate(sorted_voters):
        participation = stats["proposals_voted"] / total_proposals_count
        vp_share = stats["total_vp"] / total_vp

        if vp_share > 0.01:  # Top 1% of voting power
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

    result = []
    for label, c in clusters.items():
        if c["count"] == 0:
            continue
        result.append({
            "label": label,
            "share": round(c["count"] / total_voters, 4),
            "avg_voting_power": round(c["total_vp"] / c["count"], 4),
            "participation_rate": round(c["total_participation"] / c["count"], 4),
            "alignment_with_majority": 0.7,  # Default - would need per-proposal analysis
        })

    return result if result else _default_voter_clusters()


def _default_voter_clusters():
    """Return default voter cluster distribution."""
    return [
        {"label": "whale", "share": 0.05, "avg_voting_power": 50000, "participation_rate": 0.7, "alignment_with_majority": 0.75},
        {"label": "active_delegate", "share": 0.15, "avg_voting_power": 10000, "participation_rate": 0.6, "alignment_with_majority": 0.7},
        {"label": "regular_voter", "share": 0.30, "avg_voting_power": 1000, "participation_rate": 0.3, "alignment_with_majority": 0.65},
        {"label": "passive_holder", "share": 0.50, "avg_voting_power": 100, "participation_rate": 0.05, "alignment_with_majority": 0.6},
    ]


def compile_protocol_profile(dao_id, data):
    """Compile protocol/treasury metrics from DeFiLlama data."""
    tvl_df = data["protocol_tvl"]
    fees_df = data["protocol_fees"]
    revenue_df = data["protocol_revenue"]

    result = {
        "avg_tvl": 0,
        "tvl_trend": "stable",
        "avg_daily_fees": 0,
        "avg_daily_revenue": 0,
    }

    if not tvl_df.empty and "dao_id" in tvl_df.columns:
        dao_tvl = tvl_df[tvl_df["dao_id"] == dao_id]
        if not dao_tvl.empty and "tvl_usd" in dao_tvl.columns:
            tvl_values = pd.to_numeric(dao_tvl["tvl_usd"], errors="coerce").dropna()
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

    return result


# =============================================================================
# MAIN COMPILATION
# =============================================================================

def compile_profile(dao_id, data):
    """Compile full CalibrationProfile for a single DAO."""
    print(f"  Compiling profile for: {dao_id}")

    voting = compile_voting_profile(dao_id, data)
    proposals = compile_proposal_profile(dao_id, data)
    market = compile_market_profile(dao_id, data)
    forum = compile_forum_profile(dao_id, data)
    voter_clusters = compile_voter_clusters(dao_id, data)
    protocol = compile_protocol_profile(dao_id, data)

    profile = {
        "dao_id": dao_id,
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
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(levelname)s: %(message)s",
    )

    print("Loading historical data...")
    data = load_all_data()

    # Check what data is available
    for key, df in data.items():
        if not df.empty:
            print(f"  {key}: {len(df)} rows")

    # Discover DAO IDs
    all_dao_ids = get_all_dao_ids(data)
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
    for dao_id in dao_ids:
        try:
            profile = compile_profile(dao_id, data)
            output_path = output_dir / f"{dao_id}_profile.json"
            with open(output_path, "w") as f:
                json.dump(profile, f, indent=2, default=str)
            print(f"    -> Saved: {output_path}")
            compiled += 1
        except Exception as e:
            print(f"    ERROR compiling {dao_id}: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()

    print(f"\nDone! Compiled {compiled}/{len(dao_ids)} profiles to {output_dir}")


if __name__ == "__main__":
    main()
