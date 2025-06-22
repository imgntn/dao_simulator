from collections import Counter, deque
from typing import Deque, List


class NewsFeed:
    """Collect notable events and publish short summaries."""

    def __init__(self, event_bus, max_items: int = 20) -> None:
        self.event_bus = event_bus
        self.max_items = max_items
        self._counts: Counter[str] = Counter()
        self.summaries: Deque[str] = deque(maxlen=max_items)
        self.event_bus.subscribe("*", self._handle)

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

