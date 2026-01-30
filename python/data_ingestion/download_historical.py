#!/usr/bin/env python3
import argparse
import csv
import datetime as dt
import json
import os
import re
import time
import socket
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DIGITAL_TWINS_DIR = os.path.join(ROOT_DIR, "digital_twins")
DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "dao_sources.json")
DEFAULT_OUTPUT_DIR = os.path.join(ROOT_DIR, "results", "historical")

SNAPSHOT_GRAPHQL_URL = "https://hub.snapshot.org/graphql"
TALLY_GRAPHQL_URL = "https://api.tally.xyz/query"
COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
DEFILLAMA_BASE_URL = "https://api.llama.fi"
CRYPTOCOMPARE_BASE_URL = "https://min-api.cryptocompare.com/data"
COINCAP_BASE_URL = "https://api.coincap.io/v2"


def log(message: str) -> None:
    print(message, flush=True)


def parse_date(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    value = value.strip()
    try:
        if "T" in value:
            parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            parsed = dt.datetime.strptime(value, "%Y-%m-%d")
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return int(parsed.timestamp())
    except ValueError as exc:
        raise ValueError(f"Invalid date format: {value}") from exc


def to_iso(ts_seconds: int) -> str:
    return dt.datetime.fromtimestamp(ts_seconds, tz=dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def normalize_symbol(raw_symbol: Optional[str]) -> Optional[str]:
    if not raw_symbol:
        return None
    raw = raw_symbol.upper().strip()
    match = re.match(r"[A-Z0-9]+", raw)
    return match.group(0) if match else None


class HttpClient:
    def __init__(self, min_interval_sec: float, user_agent: str, timeout_sec: int = 30, retries: int = 3):
        self.min_interval_sec = min_interval_sec
        self.user_agent = user_agent
        self.timeout_sec = timeout_sec
        self.retries = retries
        self._last_request = 0.0

    def _sleep_if_needed(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.min_interval_sec:
            time.sleep(self.min_interval_sec - elapsed)

    def _request(self, req: urllib.request.Request) -> Any:
        backoff = 1.6
        for attempt in range(1, self.retries + 1):
            self._sleep_if_needed()
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as resp:
                    data = resp.read()
                    self._last_request = time.time()
                    return json.loads(data.decode("utf-8"))
            except urllib.error.HTTPError as exc:
                self._last_request = time.time()
                if exc.code in (429, 500, 502, 503, 504) and attempt < self.retries:
                    time.sleep(backoff)
                    backoff *= 1.7
                    continue
                raise
            except (urllib.error.URLError, TimeoutError, socket.timeout):
                self._last_request = time.time()
                if attempt < self.retries:
                    time.sleep(backoff)
                    backoff *= 1.7
                    continue
                raise

    def get_json(self, url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Any:
        if params:
            query = urllib.parse.urlencode(params)
            url = f"{url}?{query}"
        base_headers = {"User-Agent": self.user_agent}
        if headers:
            base_headers.update(headers)
        req = urllib.request.Request(url, headers=base_headers, method="GET")
        return self._request(req)

    def post_json(self, url: str, payload: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Any:
        base_headers = {"User-Agent": self.user_agent, "Content-Type": "application/json"}
        if headers:
            base_headers.update(headers)
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=base_headers, method="POST")
        return self._request(req)


def load_digital_twins() -> Dict[str, Dict[str, Any]]:
    index_path = os.path.join(DIGITAL_TWINS_DIR, "index.json")
    if not os.path.exists(index_path):
        return {}
    with open(index_path, "r", encoding="utf-8") as handle:
        index = json.load(handle)
    output: Dict[str, Dict[str, Any]] = {}
    for dao_info in index.get("daos", []):
        file_name = dao_info.get("file")
        if not file_name:
            continue
        path = os.path.join(DIGITAL_TWINS_DIR, file_name)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        dao = data.get("dao", {})
        token = dao.get("governance_token", {})
        output[dao.get("id")] = {
            "name": dao.get("name"),
            "token_symbol": token.get("symbol"),
            "token_address": token.get("contract_address"),
            "primary_chain": dao.get("primary_chain"),
        }
    return output


def load_config(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def merge_dao_configs(config: Dict[str, Any], twins: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    for dao in config.get("daos", []):
        dao_id = dao.get("id")
        twin = twins.get(dao_id, {})
        merged_entry = dict(dao)
        merged_entry["name"] = twin.get("name", dao_id)
        merged_entry["token_symbol"] = twin.get("token_symbol")
        merged_entry["token_address"] = twin.get("token_address")
        merged_entry["primary_chain"] = twin.get("primary_chain")
        merged.append(merged_entry)
    return merged


def write_csv(path: str, fieldnames: List[str], rows: Iterable[Dict[str, Any]], append: bool) -> None:
    ensure_dir(os.path.dirname(path))
    mode = "a" if append and os.path.exists(path) else "w"
    with open(path, mode, newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if mode == "w":
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def filter_rows_by_time(rows: Iterable[Dict[str, Any]], start_ts: Optional[int], end_ts: Optional[int]) -> List[Dict[str, Any]]:
    output = []
    for row in rows:
        ts = row.get("timestamp_utc")
        if ts is None:
            continue
        ts_value = int(ts)
        if start_ts and ts_value < start_ts:
            continue
        if end_ts and ts_value > end_ts:
            continue
        output.append(row)
    return output


def merge_market_series(prices: List[List[float]], caps: List[List[float]], volumes: List[List[float]]) -> Dict[int, Dict[str, float]]:
    merged: Dict[int, Dict[str, float]] = {}

    def add_series(points: List[List[float]], key: str) -> None:
        for ts_ms, value in points:
            ts = int(ts_ms / 1000)
            if ts not in merged:
                merged[ts] = {}
            merged[ts][key] = float(value)

    add_series(prices or [], "price_usd")
    add_series(caps or [], "market_cap_usd")
    add_series(volumes or [], "volume_usd")
    return merged


def resample_to_hour(series: Dict[int, Dict[str, float]]) -> Dict[int, Dict[str, float]]:
    hourly: Dict[int, Dict[str, float]] = {}
    for ts, values in series.items():
        hour_ts = int(ts / 3600) * 3600
        if hour_ts not in hourly:
            hourly[hour_ts] = values
        else:
            hourly[hour_ts] = values
    return hourly


def coingecko_fetch_daily(
    client: HttpClient,
    coin_id: str,
    vs_currency: str,
    headers: Optional[Dict[str, str]] = None,
) -> Dict[int, Dict[str, float]]:
    url = f"{COINGECKO_BASE_URL}/coins/{coin_id}/market_chart"
    payload = {"vs_currency": vs_currency, "days": "max", "interval": "daily"}
    data = client.get_json(url, params=payload, headers=headers)
    return merge_market_series(data.get("prices", []), data.get("market_caps", []), data.get("total_volumes", []))


def coingecko_fetch_hourly(
    client: HttpClient,
    coin_id: str,
    vs_currency: str,
    start_ts: int,
    end_ts: int,
    chunk_days: int,
    headers: Optional[Dict[str, str]] = None,
) -> Dict[int, Dict[str, float]]:
    url = f"{COINGECKO_BASE_URL}/coins/{coin_id}/market_chart/range"
    all_series: Dict[int, Dict[str, float]] = {}
    cursor = start_ts
    while cursor < end_ts:
        chunk_end = min(end_ts, cursor + chunk_days * 86400)
        payload = {"vs_currency": vs_currency, "from": cursor, "to": chunk_end}
        data = client.get_json(url, params=payload, headers=headers)
        merged = merge_market_series(data.get("prices", []), data.get("market_caps", []), data.get("total_volumes", []))
        for ts, values in merged.items():
            all_series[ts] = values
        cursor = chunk_end + 1
    return resample_to_hour(all_series)


def build_market_rows(dao: Dict[str, Any], series: Dict[int, Dict[str, float]], source: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for ts in sorted(series.keys()):
        values = series[ts]
        rows.append(
            {
                "dao_id": dao.get("id"),
                "dao_name": dao.get("name"),
                "token_symbol": dao.get("token_symbol"),
                "timestamp_utc": ts,
                "timestamp_iso": to_iso(ts),
                "price_usd": values.get("price_usd"),
                "market_cap_usd": values.get("market_cap_usd"),
                "volume_usd": values.get("volume_usd"),
                "source": source,
            }
        )
    return rows


def apply_supply_market_cap(series: Dict[int, Dict[str, float]], supply: Optional[float]) -> None:
    if supply is None:
        return
    for values in series.values():
        if values.get("market_cap_usd") is None and values.get("price_usd") is not None:
            values["market_cap_usd"] = values["price_usd"] * supply


def cryptocompare_fetch_supply(client: HttpClient, symbols: List[str]) -> Dict[str, Optional[float]]:
    if not symbols:
        return {}
    url = f"{CRYPTOCOMPARE_BASE_URL}/coin/generalinfo"
    params = {"fsyms": ",".join(symbols), "tsym": "USD"}
    data = client.get_json(url, params=params)
    supplies: Dict[str, Optional[float]] = {}
    for item in data.get("Data", []):
        info = item.get("CoinInfo") or {}
        conv = item.get("ConversionInfo") or {}
        symbol = info.get("Name")
        supply = conv.get("Supply")
        if symbol:
            try:
                supplies[symbol] = float(supply) if supply is not None else None
            except (TypeError, ValueError):
                supplies[symbol] = None
    return supplies


def cryptocompare_fetch_history(
    client: HttpClient,
    symbol: str,
    start_ts: int,
    end_ts: int,
    interval: str,
) -> Dict[int, Dict[str, float]]:
    if interval not in ("day", "hour"):
        raise ValueError("interval must be 'day' or 'hour'")
    endpoint = "histoday" if interval == "day" else "histohour"
    url = f"{CRYPTOCOMPARE_BASE_URL}/v2/{endpoint}"
    limit = 2000
    cursor = end_ts
    series: Dict[int, Dict[str, float]] = {}
    while cursor >= start_ts:
        params = {"fsym": symbol, "tsym": "USD", "limit": limit, "toTs": cursor}
        data = client.get_json(url, params=params)
        if data.get("Response") != "Success":
            raise RuntimeError(f"CryptoCompare error: {data.get('Message')}")
        points = data.get("Data", {}).get("Data", [])
        if not points:
            break
        oldest = None
        for point in points:
            ts = int(point.get("time", 0))
            if ts == 0:
                continue
            if ts < start_ts or ts > end_ts:
                continue
            series[ts] = {
                "price_usd": float(point.get("close", 0.0)),
                "market_cap_usd": None,
                "volume_usd": float(point.get("volumeto", 0.0)),
            }
            if oldest is None or ts < oldest:
                oldest = ts
        if oldest is None or oldest <= start_ts:
            break
        cursor = oldest - 1
    return series


def coincap_fetch_supply(client: HttpClient, asset_id: str) -> Optional[float]:
    url = f"{COINCAP_BASE_URL}/assets/{asset_id}"
    data = client.get_json(url)
    info = data.get("data") or {}
    supply = info.get("supply")
    if supply is None:
        return None
    try:
        return float(supply)
    except (TypeError, ValueError):
        return None


def coincap_fetch_history(
    client: HttpClient,
    asset_id: str,
    start_ts: int,
    end_ts: int,
    interval: str,
) -> Dict[int, Dict[str, float]]:
    interval_map = {"day": "d1", "hour": "h1"}
    if interval not in interval_map:
        raise ValueError("interval must be 'day' or 'hour'")
    start_ms = start_ts * 1000
    end_ms = end_ts * 1000
    params = {"interval": interval_map[interval], "start": start_ms, "end": end_ms}
    url = f"{COINCAP_BASE_URL}/assets/{asset_id}/history"
    data = client.get_json(url, params=params)
    points = data.get("data", [])
    series: Dict[int, Dict[str, float]] = {}
    for point in points:
        ts = int(point.get("time", 0) / 1000)
        if ts == 0:
            continue
        series[ts] = {
            "price_usd": float(point.get("priceUsd", 0.0)),
            "market_cap_usd": None,
            "volume_usd": None,
        }
    return series


def defillama_fetch_protocol_tvl(client: HttpClient, slug: str) -> List[Dict[str, Any]]:
    url = f"{DEFILLAMA_BASE_URL}/protocol/{slug}"
    data = client.get_json(url)
    rows = []
    for item in data.get("tvl", []):
        ts = int(item.get("date", 0))
        tvl = item.get("totalLiquidityUSD")
        if ts and tvl is not None:
            rows.append({"timestamp_utc": ts, "tvl_usd": tvl})
    return rows


def defillama_fetch_chain_tvl(client: HttpClient, slug: str) -> List[Dict[str, Any]]:
    url = f"{DEFILLAMA_BASE_URL}/charts/{slug}"
    data = client.get_json(url)
    rows = []
    for item in data:
        ts = int(item.get("date", 0))
        tvl = item.get("totalLiquidityUSD") or item.get("tvl")
        if ts and tvl is not None:
            rows.append({"timestamp_utc": ts, "tvl_usd": tvl})
    return rows


def defillama_fetch_overview_series(client: HttpClient, category: str, slug: str) -> List[Dict[str, Any]]:
    url = f"{DEFILLAMA_BASE_URL}/overview/{category}/{slug}"
    data = client.get_json(url)
    rows = []
    for entry in data.get("totalDataChart", []):
        if not isinstance(entry, list) or len(entry) < 2:
            continue
        ts = int(entry[0])
        value = entry[1]
        rows.append({"timestamp_utc": ts, "value_usd": value})
    return rows


def snapshot_fetch_proposals(
    client: HttpClient,
    space: str,
    start_ts: Optional[int],
    end_ts: Optional[int],
) -> List[Dict[str, Any]]:
    query = """
    query Proposals($space: String!, $first: Int!, $skip: Int!, $createdGte: Int, $createdLte: Int) {
      proposals(
        first: $first,
        skip: $skip,
        where: { space: $space, created_gte: $createdGte, created_lte: $createdLte },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        body
        choices
        start
        end
        state
        created
        type
        quorum
        snapshot
        link
        discussion
        scores_total
        space { id name }
      }
    }
    """
    proposals: List[Dict[str, Any]] = []
    skip = 0
    while True:
        variables = {
            "space": space,
            "first": 50,
            "skip": skip,
            "createdGte": start_ts,
            "createdLte": end_ts,
        }
        payload = {"query": query, "variables": variables}
        data = client.post_json(SNAPSHOT_GRAPHQL_URL, payload)
        items = data.get("data", {}).get("proposals", [])
        if not items:
            break
        proposals.extend(items)
        if len(items) < 50:
            break
        skip += 50
    return proposals


def snapshot_fetch_votes(client: HttpClient, proposal_id: str) -> List[Dict[str, Any]]:
    query = """
    query Votes($proposal: String!, $first: Int!, $skip: Int!) {
      votes(
        first: $first,
        skip: $skip,
        where: { proposal: $proposal },
        orderBy: "created",
        orderDirection: asc
      ) {
        id
        voter
        vp
        created
        choice
      }
    }
    """
    votes: List[Dict[str, Any]] = []
    skip = 0
    while True:
        variables = {"proposal": proposal_id, "first": 1000, "skip": skip}
        payload = {"query": query, "variables": variables}
        data = client.post_json(SNAPSHOT_GRAPHQL_URL, payload)
        items = data.get("data", {}).get("votes", [])
        if not items:
            break
        votes.extend(items)
        if len(items) < 1000:
            break
        skip += 1000
    return votes


def tally_fetch_proposals(
    client: HttpClient,
    api_key: str,
    org_slug: str,
    start_ts: Optional[int],
    end_ts: Optional[int],
) -> List[Dict[str, Any]]:
    query = """
    query Proposals($input: ProposalsInput!) {
      proposals(input: $input) {
        nodes {
          id
          title
          description
          status
          createdAt
          startTime
          endTime
          organization {
            id
            slug
            name
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    """
    proposals: List[Dict[str, Any]] = []
    cursor = None
    while True:
        input_obj = {
            "organizationSlug": org_slug,
            "sort": {"field": "CREATED_AT", "order": "DESC"},
            "pagination": {"limit": 50},
        }
        if cursor:
            input_obj["pagination"]["cursor"] = cursor
        payload = {"query": query, "variables": {"input": input_obj}}
        headers = {"Api-Key": api_key}
        data = client.post_json(TALLY_GRAPHQL_URL, payload, headers=headers)
        result = data.get("data", {}).get("proposals", {})
        nodes = result.get("nodes", [])
        for item in nodes:
            created = item.get("createdAt")
            if created:
                created_ts = int(dt.datetime.fromisoformat(created.replace("Z", "+00:00")).timestamp())
                if start_ts and created_ts < start_ts:
                    continue
                if end_ts and created_ts > end_ts:
                    continue
                item["created_ts"] = created_ts
            proposals.append(item)
        page = result.get("pageInfo", {})
        if not page.get("hasNextPage"):
            break
        cursor = page.get("endCursor")
        if not cursor:
            break
    return proposals


def tally_fetch_votes(client: HttpClient, api_key: str, proposal_id: str) -> List[Dict[str, Any]]:
    query = """
    query ProposalVotes($input: ProposalVotesInput!) {
      proposalVotes(input: $input) {
        nodes {
          id
          voter
          weight
          support
          reason
          createdAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    """
    votes: List[Dict[str, Any]] = []
    cursor = None
    while True:
        input_obj = {"proposalId": proposal_id, "pagination": {"limit": 100}}
        if cursor:
            input_obj["pagination"]["cursor"] = cursor
        payload = {"query": query, "variables": {"input": input_obj}}
        headers = {"Api-Key": api_key}
        data = client.post_json(TALLY_GRAPHQL_URL, payload, headers=headers)
        result = data.get("data", {}).get("proposalVotes", {})
        nodes = result.get("nodes", [])
        votes.extend(nodes)
        page = result.get("pageInfo", {})
        if not page.get("hasNextPage"):
            break
        cursor = page.get("endCursor")
        if not cursor:
            break
    return votes


def discourse_fetch_topics(
    client: HttpClient,
    base_url: str,
    start_ts: Optional[int],
    end_ts: Optional[int],
) -> List[Dict[str, Any]]:
    topics: List[Dict[str, Any]] = []
    page = 0
    while True:
        url = f"{base_url}/latest.json"
        data = client.get_json(url, params={"page": page})
        topic_list = data.get("topic_list", {})
        items = topic_list.get("topics", [])
        if not items:
            break
        reached_older = False
        for item in items:
            created_at = item.get("created_at")
            if created_at:
                created_ts = int(dt.datetime.fromisoformat(created_at.replace("Z", "+00:00")).timestamp())
                if start_ts and created_ts < start_ts:
                    reached_older = True
                    continue
                if end_ts and created_ts > end_ts:
                    continue
                item["created_ts"] = created_ts
            topics.append(item)
        if reached_older:
            break
        page += 1
    return topics


def discourse_fetch_posts(
    client: HttpClient,
    base_url: str,
    topic_id: int,
    start_ts: Optional[int],
    end_ts: Optional[int],
    api_key: Optional[str],
    api_username: Optional[str],
) -> List[Dict[str, Any]]:
    url = f"{base_url}/t/{topic_id}.json"
    headers = {}
    if api_key and api_username:
        headers["Api-Key"] = api_key
        headers["Api-Username"] = api_username
    data = client.get_json(url, headers=headers)
    posts = []
    for post in data.get("post_stream", {}).get("posts", []):
        created_at = post.get("created_at")
        if created_at:
            created_ts = int(dt.datetime.fromisoformat(created_at.replace("Z", "+00:00")).timestamp())
            if start_ts and created_ts < start_ts:
                continue
            if end_ts and created_ts > end_ts:
                continue
            post["created_ts"] = created_ts
        posts.append(post)
    return posts


def parse_maker_date(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            parsed = dt.datetime.strptime(value, fmt).replace(tzinfo=dt.timezone.utc)
            return int(parsed.timestamp())
        except ValueError:
            continue
    if "GMT" in value:
        cleaned = value.split(" GMT")[0].strip()
        for fmt in ("%a %b %d %Y %H:%M:%S", "%a %b %d %Y"):
            try:
                parsed = dt.datetime.strptime(cleaned, fmt).replace(tzinfo=dt.timezone.utc)
                return int(parsed.timestamp())
            except ValueError:
                continue
    return None


def maker_fetch_polls(api_base: str, page_start: int, page_end: Optional[int], page_size: int) -> List[Dict[str, Any]]:
    polls: List[Dict[str, Any]] = []
    page = max(page_start, 1)
    while True:
        if page_end is not None and page > page_end:
            break
        url = f"{api_base}/api/polling/v2/all-polls?page={page}&pageSize={page_size}"
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        items = data.get("polls", [])
        if not items:
            break
        polls.extend(items)
        page_info = data.get("paginationInfo", {})
        if not page_info.get("hasNextPage"):
            break
        page += 1
    return polls


def maker_fetch_poll_tally(api_base: str, poll_id: int) -> Optional[Dict[str, Any]]:
    url = f"{api_base}/api/polling/tally/{poll_id}"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data
    except urllib.error.HTTPError:
        return None


def maker_fetch_executives(api_base: str) -> List[Dict[str, Any]]:
    executives: List[Dict[str, Any]] = []
    start = 0
    limit = 50
    while True:
        url = f"{api_base}/api/executive?limit={limit}&start={start}"
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if not data:
            break
        executives.extend(data)
        if len(data) < limit:
            break
        start += limit
    return executives


def maker_fetch_executive_supporters(api_base: str) -> Optional[Dict[str, Any]]:
    url = f"{api_base}/api/executive/supporters"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data
    except urllib.error.HTTPError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Download historical data for digital twins.")
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Path to dao_sources.json")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DIR, help="Output directory for CSVs")
    parser.add_argument("--start", default=None, help="Start date (YYYY-MM-DD or ISO)")
    parser.add_argument("--end", default=None, help="End date (YYYY-MM-DD or ISO)")
    parser.add_argument("--dao", default=None, help="Comma-separated DAO ids to run (default: all)")
    parser.add_argument("--skip-market", action="store_true", help="Skip market data ingestion")
    parser.add_argument("--skip-protocol", action="store_true", help="Skip DefiLlama protocol/chain data")
    parser.add_argument("--skip-governance", action="store_true", help="Skip governance data (Snapshot/Tally)")
    parser.add_argument("--skip-forum", action="store_true", help="Skip Discourse forum data")
    parser.add_argument("--skip-votes", action="store_true", help="Skip per-proposal vote pulls")
    parser.add_argument("--skip-forum-posts", action="store_true", help="Skip Discourse posts (topics only)")
    parser.add_argument("--snapshot-space", default=None, help="Comma-separated Snapshot space ids to ingest")
    parser.add_argument(
        "--snapshot-votes-proposal-offset",
        type=int,
        default=0,
        help="Offset into Snapshot proposal list when fetching votes",
    )
    parser.add_argument(
        "--snapshot-votes-proposal-limit",
        type=int,
        default=None,
        help="Max number of Snapshot proposals to fetch votes for",
    )
    parser.add_argument("--skip-maker", action="store_true", help="Skip Maker/Sky governance data")
    parser.add_argument("--skip-maker-tallies", action="store_true", help="Skip Maker poll tallies")
    parser.add_argument("--skip-maker-supporters", action="store_true", help="Skip Maker executive supporters")
    parser.add_argument("--skip-maker-executives", action="store_true", help="Skip Maker executive proposals")
    parser.add_argument("--maker-poll-page-start", type=int, default=1, help="Maker polls page start (1-based)")
    parser.add_argument("--maker-poll-page-end", type=int, default=None, help="Maker polls page end (inclusive)")
    parser.add_argument("--maker-poll-page-size", type=int, default=30, help="Maker polls page size (max 30)")
    parser.add_argument("--hourly", action="store_true", help="Collect hourly market data")
    parser.add_argument("--daily", action="store_true", help="Collect daily market data")
    parser.add_argument("--append", action="store_true", help="Append to CSVs if they exist")
    args = parser.parse_args()

    start_ts = parse_date(args.start)
    end_ts = parse_date(args.end)
    if end_ts is None:
        end_ts = int(dt.datetime.now(tz=dt.timezone.utc).timestamp())

    config = load_config(args.config)
    twins = load_digital_twins()
    daos = merge_dao_configs(config, twins)

    if args.dao:
        include = {value.strip() for value in args.dao.split(",")}
        daos = [dao for dao in daos if dao.get("id") in include]

    if not daos:
        log("No DAOs selected.")
        return

    defaults = config.get("default", {})
    rate_limits = defaults.get("rate_limits", {})
    vs_currency = defaults.get("vs_currency", "usd")
    hourly_chunk_days = int(defaults.get("hourly_chunk_days", 30))

    if not args.hourly and not args.daily:
        hourly = True
        daily = True
    else:
        hourly = args.hourly
        daily = args.daily

    if hourly and start_ts is None:
        log("Hourly mode without a start date can be very large. Consider --start YYYY-MM-DD.")

    user_agent = "dao-simulator-data-ingestion/0.1"
    coingecko_client = HttpClient(rate_limits.get("coingecko_min_interval_sec", 1.5), user_agent)
    defillama_client = HttpClient(rate_limits.get("defillama_min_interval_sec", 0.5), user_agent)
    snapshot_client = HttpClient(rate_limits.get("snapshot_min_interval_sec", 1.5), user_agent, timeout_sec=120, retries=6)
    tally_client = HttpClient(rate_limits.get("tally_min_interval_sec", 0.8), user_agent)
    discourse_client = HttpClient(rate_limits.get("discourse_min_interval_sec", 1.0), user_agent)
    cryptocompare_client = HttpClient(rate_limits.get("cryptocompare_min_interval_sec", 2.5), user_agent)
    coincap_client = HttpClient(rate_limits.get("coincap_min_interval_sec", 2.0), user_agent)

    coingecko_api_key = os.getenv("COINGECKO_API_KEY")
    coingecko_demo_key = os.getenv("COINGECKO_DEMO_API_KEY")
    if coingecko_api_key:
        coingecko_headers = {"x-cg-pro-api-key": coingecko_api_key}
    elif coingecko_demo_key:
        coingecko_headers = {"x-cg-demo-api-key": coingecko_demo_key}
    else:
        coingecko_headers = None

    tally_api_key = os.getenv("TALLY_API_KEY")
    discourse_api_key = os.getenv("DISCOURSE_API_KEY")
    discourse_api_username = os.getenv("DISCOURSE_API_USERNAME")

    symbols = []
    coincap_supply_ids: Dict[str, str] = {}
    for dao in daos:
        symbol = dao.get("cryptocompare_symbol") or normalize_symbol(dao.get("token_symbol"))
        if symbol:
            symbols.append(symbol)
        coincap_id = dao.get("coincap_id")
        if coincap_id and symbol:
            coincap_supply_ids[symbol] = coincap_id

    if symbols:
        try:
            supply_map = cryptocompare_fetch_supply(cryptocompare_client, sorted(set(symbols)))
        except Exception as exc:
            log(f"Supply lookup failed (CryptoCompare): {exc}")
            supply_map = {}
    else:
        supply_map = {}
    for symbol, asset_id in coincap_supply_ids.items():
        if supply_map.get(symbol) is None:
            try:
                supply_map[symbol] = coincap_fetch_supply(coincap_client, asset_id)
            except Exception as exc:
                log(f"Supply lookup failed (CoinCap) for {symbol}: {exc}")
                supply_map[symbol] = None

    output_dir = args.output
    ensure_dir(output_dir)

    market_daily_path = os.path.join(output_dir, "market", "market_daily.csv")
    market_hourly_path = os.path.join(output_dir, "market", "market_hourly.csv")
    protocol_tvl_path = os.path.join(output_dir, "protocol", "protocol_tvl_daily.csv")
    protocol_fees_path = os.path.join(output_dir, "protocol", "protocol_fees_daily.csv")
    protocol_revenue_path = os.path.join(output_dir, "protocol", "protocol_revenue_daily.csv")
    snapshot_proposals_path = os.path.join(output_dir, "governance", "snapshot_proposals.csv")
    snapshot_votes_path = os.path.join(output_dir, "governance", "snapshot_votes.csv")
    tally_proposals_path = os.path.join(output_dir, "governance", "tally_proposals.csv")
    tally_votes_path = os.path.join(output_dir, "governance", "tally_votes.csv")
    maker_polls_path = os.path.join(output_dir, "governance", "maker_polls.csv")
    maker_poll_tallies_path = os.path.join(output_dir, "governance", "maker_poll_tallies.csv")
    maker_executives_path = os.path.join(output_dir, "governance", "maker_executives.csv")
    maker_executive_supporters_path = os.path.join(output_dir, "governance", "maker_executive_supporters.csv")

    written_paths: set[str] = set()

    def write_csv_run(path: str, fieldnames: List[str], rows: Iterable[Dict[str, Any]]) -> None:
        append_flag = args.append or path in written_paths
        write_csv(path, fieldnames, rows, append_flag)
        written_paths.add(path)

    existing_maker_polls = set()
    existing_maker_tallies = set()
    existing_snapshot_proposals = set()
    existing_snapshot_votes = set()
    if args.append:
        if os.path.exists(maker_polls_path):
            with open(maker_polls_path, newline="", encoding="utf-8") as handle:
                reader = csv.DictReader(handle)
                for row in reader:
                    poll_id = row.get("poll_id")
                    if poll_id:
                        existing_maker_polls.add(poll_id)
        if os.path.exists(maker_poll_tallies_path):
            with open(maker_poll_tallies_path, newline="", encoding="utf-8") as handle:
                reader = csv.DictReader(handle)
                for row in reader:
                    poll_id = row.get("poll_id")
                    if poll_id:
                        existing_maker_tallies.add(poll_id)
        if os.path.exists(snapshot_proposals_path):
            with open(snapshot_proposals_path, newline="", encoding="utf-8") as handle:
                reader = csv.DictReader(handle)
                for row in reader:
                    proposal_id = row.get("proposal_id")
                    if proposal_id:
                        existing_snapshot_proposals.add(proposal_id)
        if os.path.exists(snapshot_votes_path):
            with open(snapshot_votes_path, newline="", encoding="utf-8") as handle:
                reader = csv.DictReader(handle)
                for row in reader:
                    vote_id = row.get("vote_id")
                    if vote_id:
                        existing_snapshot_votes.add(vote_id)
    forum_topics_path = os.path.join(output_dir, "forum", "forum_topics.csv")
    forum_posts_path = os.path.join(output_dir, "forum", "forum_posts.csv")

    for dao in daos:
        dao_id = dao.get("id")
        log(f"Processing {dao_id}")

        if not args.skip_market:
            coingecko_id = dao.get("coingecko_id")
            coincap_id = dao.get("coincap_id")
            symbol = dao.get("cryptocompare_symbol") or normalize_symbol(dao.get("token_symbol"))
            supply = supply_map.get(symbol) if symbol else None

            if daily:
                daily_series = None
                daily_source = None
                if coingecko_headers and coingecko_id:
                    try:
                        daily_series = coingecko_fetch_daily(coingecko_client, coingecko_id, vs_currency, coingecko_headers)
                        daily_source = "coingecko"
                    except Exception:
                        daily_series = None
                if daily_series is None and symbol:
                    try:
                        daily_series = cryptocompare_fetch_history(
                            cryptocompare_client,
                            symbol,
                            start_ts or 0,
                            end_ts,
                            "day",
                        )
                        daily_source = "cryptocompare"
                    except Exception as exc:
                        log(f"  Market daily CryptoCompare failed for {dao_id}: {exc}")
                        daily_series = None
                if daily_series is None and coincap_id:
                    try:
                        daily_series = coincap_fetch_history(
                            coincap_client,
                            coincap_id,
                            start_ts or 0,
                            end_ts,
                            "day",
                        )
                        daily_source = "coincap"
                    except Exception as exc:
                        log(f"  Market daily CoinCap failed for {dao_id}: {exc}")
                        daily_series = None
                if daily_series:
                    apply_supply_market_cap(daily_series, supply)
                    daily_rows = build_market_rows(dao, daily_series, daily_source or "market")
                    daily_rows = filter_rows_by_time(daily_rows, start_ts, end_ts)
                    write_csv_run(
                        market_daily_path,
                        [
                            "dao_id",
                            "dao_name",
                            "token_symbol",
                            "timestamp_utc",
                            "timestamp_iso",
                            "price_usd",
                            "market_cap_usd",
                            "volume_usd",
                            "source",
                        ],
                        daily_rows,
                    )
                else:
                    log(f"  Market daily failed for {dao_id}: no available source")

            if hourly and start_ts is not None:
                hourly_series = None
                hourly_source = None
                if coingecko_headers and coingecko_id:
                    try:
                        hourly_series = coingecko_fetch_hourly(
                            coingecko_client,
                            coingecko_id,
                            vs_currency,
                            start_ts,
                            end_ts,
                            hourly_chunk_days,
                            coingecko_headers,
                        )
                        hourly_source = "coingecko"
                    except Exception:
                        hourly_series = None
                if hourly_series is None and symbol:
                    try:
                        hourly_series = cryptocompare_fetch_history(
                            cryptocompare_client,
                            symbol,
                            start_ts,
                            end_ts,
                            "hour",
                        )
                        hourly_source = "cryptocompare"
                    except Exception as exc:
                        log(f"  Market hourly CryptoCompare failed for {dao_id}: {exc}")
                        hourly_series = None
                if hourly_series is None and coincap_id:
                    try:
                        hourly_series = coincap_fetch_history(
                            coincap_client,
                            coincap_id,
                            start_ts,
                            end_ts,
                            "hour",
                        )
                        hourly_source = "coincap"
                    except Exception as exc:
                        log(f"  Market hourly CoinCap failed for {dao_id}: {exc}")
                        hourly_series = None
                if hourly_series:
                    apply_supply_market_cap(hourly_series, supply)
                    hourly_rows = build_market_rows(dao, hourly_series, hourly_source or "market")
                    hourly_rows = filter_rows_by_time(hourly_rows, start_ts, end_ts)
                    write_csv_run(
                        market_hourly_path,
                        [
                            "dao_id",
                            "dao_name",
                            "token_symbol",
                            "timestamp_utc",
                            "timestamp_iso",
                            "price_usd",
                            "market_cap_usd",
                            "volume_usd",
                            "source",
                        ],
                        hourly_rows,
                    )
                else:
                    log(f"  Market hourly failed for {dao_id}: no available source")

        if not args.skip_protocol:
            defillama = dao.get("defillama") or {}
            slug = defillama.get("slug")
            if slug:
                try:
                    if defillama.get("type") == "chain":
                        tvl_rows = defillama_fetch_chain_tvl(defillama_client, slug)
                    else:
                        tvl_rows = defillama_fetch_protocol_tvl(defillama_client, slug)
                    tvl_rows = filter_rows_by_time(tvl_rows, start_ts, end_ts)
                    write_csv_run(
                        protocol_tvl_path,
                        ["dao_id", "dao_name", "timestamp_utc", "timestamp_iso", "tvl_usd", "source"],
                        [
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "timestamp_utc": row["timestamp_utc"],
                                "timestamp_iso": to_iso(int(row["timestamp_utc"])),
                                "tvl_usd": row["tvl_usd"],
                                "source": "defillama",
                            }
                            for row in tvl_rows
                        ],
                    )
                except Exception as exc:
                    log(f"  Protocol TVL failed for {dao_id}: {exc}")
                try:
                    fees_rows = defillama_fetch_overview_series(defillama_client, "fees", slug)
                    fees_rows = filter_rows_by_time(fees_rows, start_ts, end_ts)
                    write_csv_run(
                        protocol_fees_path,
                        ["dao_id", "dao_name", "timestamp_utc", "timestamp_iso", "fees_usd", "source"],
                        [
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "timestamp_utc": row["timestamp_utc"],
                                "timestamp_iso": to_iso(int(row["timestamp_utc"])),
                                "fees_usd": row["value_usd"],
                                "source": "defillama",
                            }
                            for row in fees_rows
                        ],
                    )
                except Exception:
                    log(f"  Protocol fees: missing or unavailable for {dao_id}")
                try:
                    revenue_rows = defillama_fetch_overview_series(defillama_client, "revenue", slug)
                    revenue_rows = filter_rows_by_time(revenue_rows, start_ts, end_ts)
                    write_csv_run(
                        protocol_revenue_path,
                        ["dao_id", "dao_name", "timestamp_utc", "timestamp_iso", "revenue_usd", "source"],
                        [
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "timestamp_utc": row["timestamp_utc"],
                                "timestamp_iso": to_iso(int(row["timestamp_utc"])),
                                "revenue_usd": row["value_usd"],
                                "source": "defillama",
                            }
                            for row in revenue_rows
                        ],
                    )
                except Exception:
                    log(f"  Protocol revenue: missing or unavailable for {dao_id}")
            else:
                log(f"  Protocol: missing defillama slug for {dao_id}")

        if not args.skip_governance:
            snapshot_spaces = dao.get("snapshot_spaces") or []
            if not snapshot_spaces:
                snapshot_space = dao.get("snapshot_space")
                if snapshot_space:
                    snapshot_spaces = [snapshot_space]
            if args.snapshot_space:
                snapshot_spaces = [value.strip() for value in args.snapshot_space.split(",") if value.strip()]
            if snapshot_spaces:
                for snapshot_space in snapshot_spaces:
                    try:
                        proposals = snapshot_fetch_proposals(snapshot_client, snapshot_space, start_ts, end_ts)
                    except Exception as exc:
                        log(f"  Snapshot proposals failed for {dao_id} ({snapshot_space}): {exc}")
                        continue
                    proposal_rows = []
                    for item in proposals:
                        proposal_id = item.get("id")
                        if proposal_id in existing_snapshot_proposals:
                            continue
                        proposal_rows.append(
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "space_id": item.get("space", {}).get("id") or snapshot_space,
                                "proposal_id": proposal_id,
                                "title": item.get("title"),
                                "state": item.get("state"),
                                "created_at": item.get("created"),
                                "created_iso": to_iso(int(item.get("created", 0))) if item.get("created") else None,
                                "start_at": item.get("start"),
                                "end_at": item.get("end"),
                                "choices": json.dumps(item.get("choices", [])),
                                "type": item.get("type"),
                                "quorum": item.get("quorum"),
                                "scores_total": item.get("scores_total"),
                                "snapshot_block": item.get("snapshot"),
                                "link": item.get("link"),
                                "discussion": item.get("discussion"),
                                "source": "snapshot",
                            }
                        )
                        if proposal_id:
                            existing_snapshot_proposals.add(proposal_id)
                    write_csv_run(
                        snapshot_proposals_path,
                        [
                            "dao_id",
                            "dao_name",
                            "space_id",
                            "proposal_id",
                            "title",
                            "state",
                            "created_at",
                            "created_iso",
                            "start_at",
                            "end_at",
                            "choices",
                            "type",
                            "quorum",
                            "scores_total",
                            "snapshot_block",
                            "link",
                            "discussion",
                            "source",
                        ],
                        proposal_rows,
                    )
                    if not args.skip_votes:
                        proposals_for_votes = proposals
                        if args.snapshot_votes_proposal_offset or args.snapshot_votes_proposal_limit:
                            start_index = max(args.snapshot_votes_proposal_offset, 0)
                            end_index = (
                                start_index + args.snapshot_votes_proposal_limit
                                if args.snapshot_votes_proposal_limit
                                else None
                            )
                            proposals_for_votes = proposals[start_index:end_index]
                        vote_rows = []
                        failed_votes: List[str] = []
                        for item in proposals_for_votes:
                            proposal_id = item.get("id")
                            if not proposal_id:
                                continue
                            try:
                                votes = snapshot_fetch_votes(snapshot_client, proposal_id)
                            except Exception as exc:
                                log(f"  Snapshot votes failed for {proposal_id}: {exc}")
                                failed_votes.append(proposal_id)
                                continue
                            for vote in votes:
                                vote_id = vote.get("id")
                                if vote_id in existing_snapshot_votes:
                                    continue
                                vote_rows.append(
                                    {
                                        "dao_id": dao_id,
                                        "dao_name": dao.get("name"),
                                        "space_id": snapshot_space,
                                        "proposal_id": proposal_id,
                                        "vote_id": vote_id,
                                        "voter": vote.get("voter"),
                                        "vp": vote.get("vp"),
                                        "created_at": vote.get("created"),
                                        "created_iso": to_iso(int(vote.get("created", 0)))
                                        if vote.get("created")
                                        else None,
                                        "choice": json.dumps(vote.get("choice")),
                                        "source": "snapshot",
                                    }
                                )
                                if vote_id:
                                    existing_snapshot_votes.add(vote_id)
                        write_csv_run(
                            snapshot_votes_path,
                            [
                                "dao_id",
                                "dao_name",
                                "space_id",
                                "proposal_id",
                                "vote_id",
                                "voter",
                                "vp",
                                "created_at",
                                "created_iso",
                                "choice",
                                "source",
                            ],
                            vote_rows,
                    )
                        if failed_votes:
                            log(f"  Snapshot votes skipped {len(failed_votes)} proposals due to errors")
            else:
                log(f"  Snapshot: missing snapshot_space(s) for {dao_id}")

            tally = dao.get("tally") or {}
            if tally and tally_api_key:
                org_slug = tally.get("organization_slug")
                if org_slug:
                    proposals = tally_fetch_proposals(tally_client, tally_api_key, org_slug, start_ts, end_ts)
                    proposal_rows = []
                    for item in proposals:
                        proposal_rows.append(
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "organization_slug": item.get("organization", {}).get("slug"),
                                "proposal_id": item.get("id"),
                                "title": item.get("title"),
                                "status": item.get("status"),
                                "created_at": item.get("createdAt"),
                                "created_ts": item.get("created_ts"),
                                "start_at": item.get("startTime"),
                                "end_at": item.get("endTime"),
                                "source": "tally",
                            }
                        )
                    write_csv_run(
                        tally_proposals_path,
                        [
                            "dao_id",
                            "dao_name",
                            "organization_slug",
                            "proposal_id",
                            "title",
                            "status",
                            "created_at",
                            "created_ts",
                            "start_at",
                            "end_at",
                            "source",
                        ],
                        proposal_rows,
                    )
                    if not args.skip_votes:
                        vote_rows = []
                        for item in proposals:
                            proposal_id = item.get("id")
                            if not proposal_id:
                                continue
                            votes = tally_fetch_votes(tally_client, tally_api_key, proposal_id)
                            for vote in votes:
                                vote_rows.append(
                                    {
                                        "dao_id": dao_id,
                                        "dao_name": dao.get("name"),
                                        "proposal_id": proposal_id,
                                        "vote_id": vote.get("id"),
                                        "voter": vote.get("voter"),
                                        "weight": vote.get("weight"),
                                        "support": vote.get("support"),
                                        "reason": vote.get("reason"),
                                        "created_at": vote.get("createdAt"),
                                        "source": "tally",
                                    }
                                )
                        write_csv_run(
                            tally_votes_path,
                            [
                                "dao_id",
                                "dao_name",
                                "proposal_id",
                                "vote_id",
                                "voter",
                                "weight",
                                "support",
                                "reason",
                                "created_at",
                                "source",
                            ],
                            vote_rows,
                    )
                else:
                    log(f"  Tally: missing organization_slug for {dao_id}")
            else:
                if tally and not tally_api_key:
                    log("  Tally: missing TALLY_API_KEY env var")

        if not args.skip_forum:
            base_url = dao.get("discourse_base_url")
            if base_url:
                try:
                    topics = discourse_fetch_topics(discourse_client, base_url, start_ts, end_ts)
                except Exception as exc:
                    log(f"  Forum topics failed for {dao_id}: {exc}")
                    topics = []
                topic_rows = []
                for item in topics:
                    topic_rows.append(
                        {
                            "dao_id": dao_id,
                            "dao_name": dao.get("name"),
                            "topic_id": item.get("id"),
                            "title": item.get("title"),
                            "slug": item.get("slug"),
                            "created_at": item.get("created_at"),
                            "created_ts": item.get("created_ts"),
                            "last_posted_at": item.get("last_posted_at"),
                            "posts_count": item.get("posts_count"),
                            "views": item.get("views"),
                            "like_count": item.get("like_count"),
                            "source": "discourse",
                        }
                    )
                write_csv_run(
                    forum_topics_path,
                    [
                        "dao_id",
                        "dao_name",
                        "topic_id",
                        "title",
                        "slug",
                        "created_at",
                        "created_ts",
                        "last_posted_at",
                        "posts_count",
                        "views",
                        "like_count",
                        "source",
                    ],
                    topic_rows,
                )
                if not args.skip_forum_posts:
                    post_rows = []
                    for topic in topics:
                        topic_id = topic.get("id")
                        if not topic_id:
                            continue
                        posts = discourse_fetch_posts(
                            discourse_client,
                            base_url,
                            int(topic_id),
                            start_ts,
                            end_ts,
                            discourse_api_key,
                            discourse_api_username,
                        )
                        for post in posts:
                            post_rows.append(
                                {
                                    "dao_id": dao_id,
                                    "dao_name": dao.get("name"),
                                    "topic_id": topic_id,
                                    "post_id": post.get("id"),
                                    "post_number": post.get("post_number"),
                                    "created_at": post.get("created_at"),
                                    "created_ts": post.get("created_ts"),
                                    "author": post.get("username"),
                                    "reply_to_post_number": post.get("reply_to_post_number"),
                                    "like_count": post.get("like_count"),
                                    "raw": post.get("raw"),
                                    "source": "discourse",
                                }
                            )
                    write_csv_run(
                        forum_posts_path,
                        [
                            "dao_id",
                            "dao_name",
                            "topic_id",
                            "post_id",
                            "post_number",
                            "created_at",
                            "created_ts",
                            "author",
                            "reply_to_post_number",
                            "like_count",
                            "raw",
                            "source",
                        ],
                        post_rows,
                    )
            else:
                log(f"  Forum: missing discourse_base_url for {dao_id}")

        if not args.skip_maker:
            maker_api_base = dao.get("maker_api_base")
            if maker_api_base:
                try:
                    polls = maker_fetch_polls(
                        maker_api_base,
                        args.maker_poll_page_start,
                        args.maker_poll_page_end,
                        args.maker_poll_page_size,
                    )
                except Exception as exc:
                    log(f"  Maker polls failed for {dao_id}: {exc}")
                    polls = []
                poll_rows = []
                for poll in polls:
                    poll_id = poll.get("pollId")
                    if poll_id is None:
                        continue
                    if str(poll_id) in existing_maker_polls:
                        continue
                    start_ts_poll = parse_maker_date(poll.get("startDate"))
                    end_ts_poll = parse_maker_date(poll.get("endDate"))
                    if start_ts and start_ts_poll and start_ts_poll < start_ts:
                        continue
                    if end_ts and end_ts_poll and end_ts_poll > end_ts:
                        continue
                    poll_rows.append(
                        {
                            "dao_id": dao_id,
                            "dao_name": dao.get("name"),
                            "poll_id": poll_id,
                            "slug": poll.get("slug"),
                            "title": poll.get("title"),
                            "start_date": poll.get("startDate"),
                            "end_date": poll.get("endDate"),
                            "type": poll.get("type"),
                            "parameters": json.dumps(poll.get("parameters")),
                            "source": "makerdao",
                        }
                    )
                write_csv_run(
                    maker_polls_path,
                    [
                        "dao_id",
                        "dao_name",
                        "poll_id",
                        "slug",
                        "title",
                        "start_date",
                        "end_date",
                        "type",
                        "parameters",
                        "source",
                    ],
                    poll_rows,
                )
                if not args.skip_maker_tallies:
                    tally_rows = []
                    for poll in poll_rows:
                        poll_id = poll.get("poll_id")
                        if poll_id is None:
                            continue
                        if str(poll_id) in existing_maker_tallies:
                            continue
                        tally = maker_fetch_poll_tally(maker_api_base, int(poll_id))
                        if tally is None:
                            continue
                        tally_rows.append(
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "poll_id": poll_id,
                                "total_mkr_participation": tally.get("totalMkrParticipation"),
                                "winner": tally.get("winner"),
                                "num_voters": tally.get("numVoters"),
                                "winning_option_name": tally.get("winningOptionName"),
                                "results": json.dumps(tally.get("results")),
                                "source": "makerdao",
                            }
                        )
                    write_csv_run(
                        maker_poll_tallies_path,
                        [
                            "dao_id",
                            "dao_name",
                            "poll_id",
                            "total_mkr_participation",
                            "winner",
                            "num_voters",
                            "winning_option_name",
                            "results",
                            "source",
                        ],
                        tally_rows,
                    )

                executives = []
                if not args.skip_maker_executives:
                    try:
                        executives = maker_fetch_executives(maker_api_base)
                    except Exception as exc:
                        log(f"  Maker executives failed for {dao_id}: {exc}")
                        executives = []
                exec_rows = []
                if executives:
                    for exec_item in executives:
                        exec_date_ts = parse_maker_date(exec_item.get("date"))
                        if start_ts and exec_date_ts and exec_date_ts < start_ts:
                            continue
                        if end_ts and exec_date_ts and exec_date_ts > end_ts:
                            continue
                        exec_rows.append(
                            {
                                "dao_id": dao_id,
                                "dao_name": dao.get("name"),
                                "key": exec_item.get("key"),
                                "title": exec_item.get("title"),
                                "address": exec_item.get("address"),
                                "date": exec_item.get("date"),
                                "active": exec_item.get("active"),
                                "proposal_link": exec_item.get("proposalLink"),
                                "spell_data": json.dumps(exec_item.get("spellData")),
                                "source": "makerdao",
                            }
                        )
                    write_csv_run(
                        maker_executives_path,
                        [
                            "dao_id",
                            "dao_name",
                            "key",
                            "title",
                            "address",
                            "date",
                            "active",
                            "proposal_link",
                            "spell_data",
                            "source",
                        ],
                        exec_rows,
                    )

                if not args.skip_maker_supporters:
                    try:
                        supporters = maker_fetch_executive_supporters(maker_api_base)
                    except Exception as exc:
                        log(f"  Maker supporters failed for {dao_id}: {exc}")
                        supporters = None
                    if supporters:
                        supporter_rows = []
                        for exec_address, supporters_list in supporters.items():
                            for supporter in supporters_list:
                                supporter_rows.append(
                                    {
                                        "dao_id": dao_id,
                                        "dao_name": dao.get("name"),
                                        "executive_address": exec_address,
                                        "supporter_address": supporter.get("address"),
                                        "deposits": supporter.get("deposits"),
                                        "percent": supporter.get("percent"),
                                        "source": "makerdao",
                                    }
                                )
                        write_csv_run(
                            maker_executive_supporters_path,
                            [
                                "dao_id",
                                "dao_name",
                                "executive_address",
                                "supporter_address",
                                "deposits",
                                "percent",
                                "source",
                            ],
                            supporter_rows,
                        )
            else:
                if dao_id == "maker_sky":
                    log("  Maker: missing maker_api_base for Maker/Sky")

    log("Done.")


if __name__ == "__main__":
    main()
