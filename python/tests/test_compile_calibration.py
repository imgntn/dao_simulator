import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import pandas as pd


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "data_ingestion"
    / "compile_calibration.py"
)
SPEC = importlib.util.spec_from_file_location("compile_calibration", MODULE_PATH)
compile_calibration = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(compile_calibration)

LEDGER_MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "data_ingestion"
    / "build_source_ledger.py"
)
LEDGER_SPEC = importlib.util.spec_from_file_location(
    "build_source_ledger",
    LEDGER_MODULE_PATH,
)
build_source_ledger = importlib.util.module_from_spec(LEDGER_SPEC)
LEDGER_SPEC.loader.exec_module(build_source_ledger)


def empty_sources():
    return {
        key: pd.DataFrame()
        for key in (
            "market_daily",
            "snapshot_proposals",
            "snapshot_votes",
            "tally_proposals",
            "tally_votes",
            "maker_polls",
            "maker_poll_tallies",
            "forum_topics",
            "forum_posts",
            "protocol_tvl",
            "protocol_fees",
            "protocol_revenue",
        )
    }


class CalibrationCompilerMissingDataTests(unittest.TestCase):
    def test_empty_governance_estimands_are_null(self):
        data = empty_sources()

        voting = compile_calibration.compile_voting_profile("dao", data)
        proposals = compile_calibration.compile_proposal_profile("dao", data)

        self.assertIsNone(voting["avg_participation_rate"])
        self.assertIsNone(voting["avg_votes_per_proposal"])
        self.assertIsNone(voting["voter_concentration"])
        self.assertIsNone(voting["approval_rate"])
        self.assertIsNone(voting["avg_for_percentage"])
        self.assertIsNone(voting["quorum_hit_rate"])
        self.assertEqual(voting["participation_distribution"], [])
        self.assertIsNone(proposals["avg_proposals_per_month"])
        self.assertIsNone(proposals["avg_voting_period_days"])
        self.assertIsNone(proposals["avg_choices_per_proposal"])
        self.assertIsNone(proposals["pass_rate"])

    def test_declared_empty_months_are_observed_zero_activity(self):
        proposals = compile_calibration.compile_proposal_profile(
            "dao",
            empty_sources(),
            {"start": "2024-01-01", "end": "2024-02-29"},
        )

        self.assertEqual(proposals["avg_proposals_per_month"], 0.0)
        self.assertEqual(proposals["monthly_cadence"], [0, 0])

    def test_market_profile_never_fabricates_volatility_cap_or_volume(self):
        data = empty_sources()
        data["market_daily"] = pd.DataFrame({
            "dao_id": ["dao", "dao"],
            "price_usd": [1.0, 1.0],
            "timestamp_utc": ["2024-01-01", "2024-01-02"],
        })

        market = compile_calibration.compile_market_profile("dao", data)

        self.assertEqual(market["daily_volatility"], 0.0)
        self.assertIsNone(market["avg_market_cap"])
        self.assertIsNone(market["avg_daily_volume"])
        self.assertIsNone(market["correlation_to_eth"])

    def test_forum_profile_never_fabricates_engagement_values(self):
        data = empty_sources()
        data["forum_topics"] = pd.DataFrame({
            "dao_id": ["dao"],
            "created_at": ["2024-01-01"],
            "title": ["Governance"],
        })

        forum = compile_calibration.compile_forum_profile(
            "dao",
            data,
            {"start": "2024-01-01", "end": "2024-01-31"},
        )

        self.assertEqual(forum["avg_topics_per_month"], 1.0)
        self.assertIsNone(forum["avg_posts_per_topic"])
        self.assertIsNone(forum["avg_views_per_topic"])
        self.assertIsNone(forum["avg_post_length_chars"])
        self.assertIsNone(forum["reply_rate"])

    def test_positive_quorum_without_score_is_not_classified(self):
        proposals = pd.DataFrame([{
            "proposal_id": "p1",
            "choices": '["For", "Against"]',
            "quorum": 10,
            "scores_total": None,
        }])
        votes = pd.DataFrame([
            {"proposal_id": "p1", "choice": 1, "vp": 20},
        ])

        outcomes = compile_calibration.snapshot_binary_outcomes(
            proposals,
            votes,
        )

        self.assertEqual(outcomes, [])

    def test_short_tvl_series_has_no_fabricated_stable_trend(self):
        data = empty_sources()
        data["protocol_tvl"] = pd.DataFrame({
            "dao_id": ["dao", "dao"],
            "timestamp_iso": [
                "2024-01-02T00:00:00Z",
                "2024-01-01T00:00:00Z",
            ],
            "tvl_usd": [200, 100],
        })

        protocol = compile_calibration.compile_protocol_profile("dao", data)

        self.assertEqual(protocol["avg_tvl"], 150.0)
        self.assertIsNone(protocol["tvl_trend"])

    def test_voter_cluster_participation_includes_zero_vote_proposals(self):
        data = empty_sources()
        data["snapshot_proposals"] = pd.DataFrame({
            "dao_id": ["dao", "dao"],
            "proposal_id": ["p1", "p2"],
        })
        data["snapshot_votes"] = pd.DataFrame({
            "dao_id": ["dao"],
            "proposal_id": ["p1"],
            "voter": ["0x1"],
            "vp": [10],
            "choice": [1],
        })

        clusters = compile_calibration.compile_voter_clusters("dao", data)

        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["participation_rate"], 0.5)

    def test_weighted_snapshot_choices_allocate_voting_power_fractionally(self):
        proposals = pd.DataFrame([{
            "proposal_id": "p1",
            "choices": '["For", "Against"]',
            "quorum": 0,
            "scores_total": 100,
        }])
        votes = pd.DataFrame([
            {"proposal_id": "p1", "choice": '{"1": 0.75, "2": 0.25}', "vp": 100},
        ])

        outcomes = compile_calibration.snapshot_binary_outcomes(proposals, votes)

        self.assertTrue(outcomes[0]["passed"])
        self.assertEqual(outcomes[0]["for_share"], 0.75)

    def test_canceled_tally_proposals_are_excluded_from_pass_rate(self):
        data = empty_sources()
        data["tally_proposals"] = pd.DataFrame({
            "dao_id": ["dao", "dao"],
            "proposal_id": ["p1", "p2"],
            "status": ["passed", "canceled"],
        })

        proposals = compile_calibration.compile_proposal_profile(
            "dao",
            data,
            {"start": "2024-01-01", "end": "2024-01-31"},
        )

        self.assertEqual(proposals["pass_rate"], 1.0)


class HistoricalSourceLedgerTests(unittest.TestCase):
    def test_ledger_hashes_rows_dates_sources_and_policy_coverage(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            table_dir = root / "governance"
            table_dir.mkdir()
            table = table_dir / "votes.csv"
            table.write_text(
                "dao_id,created_iso,source\n"
                "dao,2024-01-01T00:00:00Z,snapshot\n"
                "dao,invalid,snapshot\n",
                encoding="utf-8",
            )
            policies = root / "policies.json"
            policies.write_text(json.dumps({
                "schema_version": "1.0.0",
                "reviewed_at_utc": "2026-07-17T00:00:00Z",
                "review_scope": "test",
                "sources": {"snapshot": {"release_policy": "exclude_raw_rows"}},
            }), encoding="utf-8")

            ledger = build_source_ledger.build_ledger(root, policies)

            self.assertEqual(ledger["table_count"], 1)
            self.assertEqual(ledger["total_rows"], 2)
            self.assertEqual(ledger["unresolved_sources"], [])
            self.assertEqual(ledger["tables"][0]["invalid_date_rows"], 1)
            self.assertEqual(ledger["tables"][0]["sources"], {"snapshot": 2})
            self.assertEqual(len(ledger["tables"][0]["sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
