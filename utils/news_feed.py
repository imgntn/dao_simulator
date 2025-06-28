from collections import Counter, deque
from typing import Deque, List

# very small set just to filter obvious filler words
STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "with",
    "is",
    "no",
    "not",
    "step",
}


class NewsFeed:
    """Collect notable events and publish short summaries."""

    def __init__(self, event_bus, max_items: int = 20) -> None:
        self.event_bus = event_bus
        self.max_items = max_items
        self._counts: Counter[str] = Counter()
        self.word_counts: Counter[str] = Counter()
        self.summaries: Deque[str] = deque(maxlen=max_items)
        self.event_bus.subscribe("*", self._handle)

    def get_trending(self, n: int = 10) -> List[tuple[str, int]]:
        """Return top ``n`` words by occurrence in summaries."""
        return self.word_counts.most_common(n)

    def _handle(self, event: str, **data) -> None:
        if event == "step_end":
            step = data.get("step", 0)
            if self._counts:
                parts = []
                for name, cnt in self._counts.items():
                    label = name.replace("_", " ")
                    if cnt > 1:
                        label += "s"
                    parts.append(f"{cnt} {label}")
                summary = f"Step {step}: " + ", ".join(parts)
            else:
                summary = f"Step {step}: no notable activity"
            self.summaries.appendleft(summary)
            # update trending words
            for tok in summary.lower().split():
                tok = tok.strip(".,:;!?\"'\n\r")
                if not tok or tok in STOPWORDS or tok.isdigit():
                    continue
                self.word_counts[tok] += 1
            self.event_bus.publish("news_update", step=step, summary=summary)
            self._counts.clear()
        else:
            notable = {
                "proposal_created",
                "nft_minted",
                "nft_sold",
                "guild_created",
                "guild_joined",
                "guild_left",
                "project_completed",
                "tokens_staked",
            }
            if event in notable:
                self._counts[event] += 1

