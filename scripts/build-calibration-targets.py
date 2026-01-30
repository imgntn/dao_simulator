import csv
import glob
import json
import math
import statistics
from collections import defaultdict
from pathlib import Path

ANCHORS = {
    'aave': {'name': 'Aave', 'token': 'AAVE'},
    'lido': {'name': 'Lido DAO', 'token': 'LDO'},
    'maker_sky': {'name': 'Sky (MakerDAO)', 'token': 'MKR'},
    'uniswap': {'name': 'Uniswap DAO', 'token': 'UNI'},
    'arbitrum': {'name': 'Arbitrum DAO', 'token': 'ARB'},
    'optimism': {'name': 'Optimism', 'token': 'OP'},
}

ROOT = Path('.')
GOVERNANCE_GLOBS = list(ROOT.glob('results/historical_2024_q*_daily/governance'))
MARKET_GLOBS = list(ROOT.glob('results/historical_2024_q*_daily/market'))

# ---------------------------
# Snapshot governance metrics
# ---------------------------
proposals = {}
proposals_by_dao = defaultdict(list)

for gdir in GOVERNANCE_GLOBS:
    ppath = gdir / 'snapshot_proposals.csv'
    if not ppath.exists():
        continue
    with ppath.open(newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            dao_id = row.get('dao_id')
            if dao_id not in ANCHORS:
                continue
            proposals[row['proposal_id']] = row
            proposals_by_dao[dao_id].append(row)

votes_by_proposal = defaultdict(list)
for gdir in GOVERNANCE_GLOBS:
    vpath = gdir / 'snapshot_votes.csv'
    if not vpath.exists():
        continue
    with vpath.open(newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            dao_id = row.get('dao_id')
            if dao_id not in ANCHORS:
                continue
            votes_by_proposal[row['proposal_id']].append(row)


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except Exception:
        return default


def _parse_choice(raw):
    if raw is None:
        return None
    raw = str(raw).strip()
    if not raw:
        return None
    if raw.startswith('{') or raw.startswith('['):
        # approval or ranked formats - skip for pass/fail
        return None
    try:
        return int(float(raw))
    except Exception:
        return None


def _classify_binary(choices):
    lower = [c.strip().lower() for c in choices]
    if 'yes' in lower and 'no' in lower:
        return ('yes', 'no')
    if 'for' in lower and 'against' in lower:
        return ('for', 'against')
    return None


snapshot_metrics = {}
for dao_id, rows in proposals_by_dao.items():
    total_votes = []
    quorums = []
    quorum_reach = 0
    quorum_applicable = 0
    binary_total = 0
    binary_pass = 0
    for row in rows:
        proposal_id = row['proposal_id']
        scores_total = _safe_float(row.get('scores_total'))
        quorum = _safe_float(row.get('quorum'))
        if scores_total:
            total_votes.append(scores_total)
        if quorum and quorum > 0:
            quorums.append(quorum)
            quorum_applicable += 1
            if scores_total >= quorum:
                quorum_reach += 1

        # Pass rate for binary yes/no or for/against proposals
        try:
            choices = json.loads(row.get('choices') or '[]')
        except Exception:
            choices = []
        binary = _classify_binary(choices)
        if not binary:
            continue
        votes = votes_by_proposal.get(proposal_id, [])
        if not votes:
            continue
        label_yes, label_no = binary
        idx_map = {i + 1: choices[i].strip().lower() for i in range(len(choices))}
        yes_votes = 0.0
        no_votes = 0.0
        for v in votes:
            choice_idx = _parse_choice(v.get('choice'))
            if choice_idx is None:
                continue
            label = idx_map.get(choice_idx)
            if not label:
                continue
            vp = _safe_float(v.get('vp'))
            if label == label_yes:
                yes_votes += vp
            elif label == label_no:
                no_votes += vp
        if yes_votes == 0 and no_votes == 0:
            continue
        binary_total += 1
        passed = yes_votes > no_votes
        if quorum and quorum > 0:
            passed = passed and ((yes_votes + no_votes) >= quorum)
        if passed:
            binary_pass += 1

    snapshot_metrics[dao_id] = {
        'proposal_count': len(rows),
        'avg_total_votes': statistics.mean(total_votes) if total_votes else 0.0,
        'avg_quorum': statistics.mean(quorums) if quorums else 0.0,
        'quorum_reach_rate': (quorum_reach / quorum_applicable) if quorum_applicable else None,
        'binary_classified': binary_total,
        'binary_pass_rate': (binary_pass / binary_total) if binary_total else None,
    }

# ---------------------------
# Maker poll metrics
# ---------------------------
maker_poll_rows = []
for gdir in GOVERNANCE_GLOBS:
    ppath = gdir / 'maker_poll_tallies.csv'
    if not ppath.exists():
        continue
    with ppath.open(newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row.get('dao_id') != 'maker_sky':
                continue
            maker_poll_rows.append(row)

maker_metrics = {}
if maker_poll_rows:
    participation = []
    passes = 0
    classified = 0
    for row in maker_poll_rows:
        total = row.get('total_mkr_participation')
        try:
            total_mkr = float(total) / 1e18
        except Exception:
            total_mkr = 0.0
        if total_mkr:
            participation.append(total_mkr)
        winner = (row.get('winning_option_name') or '').strip().lower()
        if winner:
            classified += 1
            if 'yes' in winner or 'approve' in winner or 'for' in winner:
                passes += 1
    maker_metrics = {
        'poll_count': len(maker_poll_rows),
        'avg_mkr_participation': statistics.mean(participation) if participation else 0.0,
        'median_mkr_participation': statistics.median(participation) if participation else 0.0,
        'poll_pass_rate': (passes / classified) if classified else None,
    }

# ---------------------------
# Market volatility (proxy)
# ---------------------------
prices_by_dao = defaultdict(list)
for mdir in MARKET_GLOBS:
    mpath = mdir / 'market_daily.csv'
    if not mpath.exists():
        continue
    with mpath.open(newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            dao_id = row.get('dao_id')
            if dao_id not in ANCHORS:
                continue
            ts = int(row.get('timestamp_utc') or 0)
            price = _safe_float(row.get('price_usd'))
            if ts and price:
                prices_by_dao[dao_id].append((ts, price))

vol_metrics = {}
for dao_id, series in prices_by_dao.items():
    series = sorted(series, key=lambda x: x[0])
    returns = []
    prev = None
    for _, price in series:
        if prev is not None and prev > 0:
            returns.append(math.log(price / prev))
        prev = price
    if len(returns) >= 2:
        stdev = statistics.pstdev(returns)
        annualized = stdev * math.sqrt(365)
    else:
        stdev = 0.0
        annualized = 0.0
    vol_metrics[dao_id] = {
        'days': len(series),
        'annualized_vol': annualized,
    }

# ---------------------------
# Governance parameters (from digital twins)
# ---------------------------
param_targets = {}
for dao_id in ANCHORS:
    twin_path = Path('digital_twins') / f'{dao_id}.json'
    if not twin_path.exists():
        continue
    with twin_path.open(encoding='utf-8') as f:
        data = json.load(f)
    gov = data['dao'].get('simulation_parameters', {}).get('governance', {})
    sources = data['dao'].get('sources', [])
    param_targets[dao_id] = {
        'gov': gov,
        'sources': sources,
    }

# ---------------------------
# Write markdown
# ---------------------------
lines = []
lines.append('# Academic Calibration Targets')
lines.append('')
lines.append('This grounding table summarizes governance participation and market volatility proxies derived from the local historical dataset (2024 daily) and governance parameter targets from the digital twins.')
lines.append('')
lines.append('## Coverage')
lines.append('')
lines.append('- Time window: 2024-01-01 through 2024-12-31 (daily).')
lines.append('- Governance sources: Snapshot proposals/votes and MakerDAO polls from `results/historical_2024_q*_daily/governance/`.')
lines.append('- Market sources: `results/historical_2024_q*_daily/market/market_daily.csv` (CryptoCompare feed).')
lines.append('')

lines.append('## Governance Parameter Targets (Digital Twins)')
lines.append('')
lines.append('| DAO | Proposal threshold | Quorum | Voting period | Notes |')
lines.append('| --- | --- | --- | --- | --- |')
for dao_id, meta in ANCHORS.items():
    gov = param_targets.get(dao_id, {}).get('gov', {})
    notes = ''
    proposal = 'N/A'
    quorum = 'N/A'
    voting = 'N/A'
    if dao_id == 'aave':
        short = gov.get('executors', {}).get('short_executor', {})
        long = gov.get('executors', {}).get('long_executor', {})
        if short:
            proposal = f"short: {short.get('proposal_threshold', {}).get('value', 'N/A')} AAVE; long: {long.get('proposal_threshold_pct_supply', 'N/A')}%"
            quorum = f"short: {short.get('quorum_yes', {}).get('value', 'N/A')} AAVE; long: {long.get('quorum_yes_pct_supply', 'N/A')}%"
            voting = f"short: {short.get('voting_period_days', 'N/A')}d; long: {long.get('voting_period_days', 'N/A')}d"
            notes = 'Dual executor thresholds'
    elif dao_id == 'uniswap':
        proposal = f"{gov.get('proposal_threshold', {}).get('value', 'N/A')} UNI"
        quorum = f"{gov.get('quorum', {}).get('value', 'N/A')} UNI"
        voting = f"{gov.get('voting_period_days', 'N/A')}d"
    elif dao_id == 'arbitrum':
        proposal = f"{gov.get('proposal_threshold', {}).get('value', 'N/A')} ARB"
        quorum_pct = gov.get('quorum_pct_votable', {})
        quorum = f"non-const: {quorum_pct.get('non_constitutional', 'N/A')}%; const: {quorum_pct.get('constitutional', 'N/A')}%"
        vp = gov.get('voting_period_days_range')
        voting = f"{vp[0]}-{vp[1]}d" if vp else 'N/A'
    elif dao_id == 'optimism':
        th = gov.get('token_house', {})
        quorum = f"{th.get('quorum_pct_votable_supply', 'N/A')}%"
        voting = f"{th.get('typical_voting_window_days', 'N/A')}d"
        proposal = 'N/A'
        notes = 'Token House quorum/approval'
    elif dao_id == 'lido':
        proposal = 'N/A'
        quorum = 'N/A'
        voting = f"offchain {gov.get('offchain_vote_days', 'N/A')}d; onchain {gov.get('onchain_vote_days', 'N/A')}d"
        notes = 'Snapshot + onchain voting'
    elif dao_id == 'maker_sky':
        proposal = 'N/A'
        quorum = 'N/A'
        voting = 'continuous / weekly'
        notes = 'Polling + executive approvals'

    lines.append(f"| {meta['name']} | {proposal} | {quorum} | {voting} | {notes} |")

lines.append('')
lines.append('## Governance Participation Targets (2024 Snapshot/Maker)')
lines.append('')
lines.append('| DAO | Proposals (count) | Binary pass rate | Quorum reach rate | Avg total votes (token-weighted) | Avg quorum |')
lines.append('| --- | ---: | ---: | ---: | ---: | ---: |')
for dao_id, meta in ANCHORS.items():
    if dao_id == 'maker_sky':
        lines.append(f"| {meta['name']} | {maker_metrics.get('poll_count','0')} polls | {maker_metrics.get('poll_pass_rate','N/A')} | N/A | {round(maker_metrics.get('avg_mkr_participation',0.0),2)} MKR | N/A |")
        continue
    m = snapshot_metrics.get(dao_id, {})
    pass_rate = m.get('binary_pass_rate')
    quorum_reach = m.get('quorum_reach_rate')
    lines.append(
        f"| {meta['name']} | {m.get('proposal_count',0)} | "
        f"{('%.2f' % pass_rate) if pass_rate is not None else 'N/A'} | "
        f"{('%.2f' % quorum_reach) if quorum_reach is not None else 'N/A'} | "
        f"{round(m.get('avg_total_votes',0.0),2)} | {round(m.get('avg_quorum',0.0),2)} |"
    )

lines.append('')
lines.append('## Treasury Volatility Proxy (Token Price, 2024 Daily)')
lines.append('')
lines.append('| DAO | Token | Days | Annualized vol (log returns) |')
lines.append('| --- | --- | ---: | ---: |')
for dao_id, meta in ANCHORS.items():
    vol = vol_metrics.get(dao_id, {})
    lines.append(
        f"| {meta['name']} | {meta['token']} | {vol.get('days',0)} | {round(vol.get('annualized_vol',0.0),4)} |"
    )

lines.append('')
lines.append('## Realism Bands (Initial)')
lines.append('')
lines.append('These bands are used for initial calibration checks. They are defined as:')
lines.append('- Rates (pass/quorum reach): +/- 0.10 absolute, clamped to [0, 1].')
lines.append('- Participation (avg total votes): +/- 25% relative.')
lines.append('- Volatility proxy (annualized): +/- 25% relative.')
lines.append('')
lines.append('| DAO | Pass rate band | Quorum reach band | Avg votes band | Volatility band |')
lines.append('| --- | --- | --- | --- | --- |')
for dao_id, meta in ANCHORS.items():
    pass_rate = None
    quorum_rate = None
    avg_votes = None
    if dao_id == 'maker_sky':
        pass_rate = maker_metrics.get('poll_pass_rate')
        avg_votes = maker_metrics.get('avg_mkr_participation')
    else:
        m = snapshot_metrics.get(dao_id, {})
        pass_rate = m.get('binary_pass_rate')
        quorum_rate = m.get('quorum_reach_rate')
        avg_votes = m.get('avg_total_votes')
    vol = vol_metrics.get(dao_id, {}).get('annualized_vol')

    def _band_rate(val):
        if val is None:
            return 'N/A'
        lo = max(0.0, val - 0.10)
        hi = min(1.0, val + 0.10)
        return f"{lo:.2f}-{hi:.2f}"

    def _band_rel(val):
        if val is None:
            return 'N/A'
        lo = val * 0.75
        hi = val * 1.25
        return f"{round(lo,2)}-{round(hi,2)}"

    lines.append(
        f"| {meta['name']} | {_band_rate(pass_rate)} | {_band_rate(quorum_rate)} | {_band_rel(avg_votes)} | {_band_rel(vol)} |"
    )

lines.append('')
lines.append('## Sources')
lines.append('')
lines.append('- Governance: Snapshot proposal/vote exports and MakerDAO poll exports captured in `results/historical_2024_q*_daily/governance/`.')
lines.append('- Markets: CryptoCompare daily price feed captured in `results/historical_2024_q*_daily/market/market_daily.csv`.')
lines.append('- Governance parameter targets: digital twin sources listed in each twin JSON file:')
for dao_id, meta in ANCHORS.items():
    twin = param_targets.get(dao_id, {})
    sources = twin.get('sources', [])
    if not sources:
        continue
    lines.append(f"  - {meta['name']}:")
    for src in sources:
        title = src.get('title', 'source')
        url = src.get('url', '')
        lines.append(f"    - {title} ({url})")

out_path = Path('docs') / 'ACADEMIC_CALIBRATION_TARGETS.md'
out_path.write_text('\n'.join(lines), encoding='utf-8')
print(f'Wrote {out_path}')
