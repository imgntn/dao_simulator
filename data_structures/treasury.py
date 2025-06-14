from collections import defaultdict

from utils import RandomWalkOracle, PriceOracle


class LiquidityPool:
    """Simple constant-product automated market maker."""

    def __init__(self, token_a: str, token_b: str, event_bus=None) -> None:
        self.token_a = token_a
        self.token_b = token_b
        self.reserve_a = 0.0
        self.reserve_b = 0.0
        self.event_bus = event_bus

    def add_liquidity(self, amount_a: float, amount_b: float) -> None:
        self.reserve_a += amount_a
        self.reserve_b += amount_b
        if self.event_bus:
            self.event_bus.publish(
                "liquidity_added",
                step=0,
                token_a=self.token_a,
                token_b=self.token_b,
                amount_a=amount_a,
                amount_b=amount_b,
            )

    def remove_liquidity(self, share: float) -> tuple[float, float]:
        share = max(min(share, 1.0), 0.0)
        amount_a = self.reserve_a * share
        amount_b = self.reserve_b * share
        self.reserve_a -= amount_a
        self.reserve_b -= amount_b
        if self.event_bus:
            self.event_bus.publish(
                "liquidity_removed",
                step=0,
                token_a=self.token_a,
                token_b=self.token_b,
                amount_a=amount_a,
                amount_b=amount_b,
            )
        return amount_a, amount_b

    def swap(self, token_in: str, amount_in: float) -> float:
        if token_in == self.token_a:
            in_reserve, out_reserve = self.reserve_a, self.reserve_b
            k = in_reserve * out_reserve
            new_in = in_reserve + amount_in
            new_out = k / new_in
            amount_out = out_reserve - new_out
            self.reserve_a = new_in
            self.reserve_b = new_out
            t_out = self.token_b
        else:
            in_reserve, out_reserve = self.reserve_b, self.reserve_a
            k = in_reserve * out_reserve
            new_in = in_reserve + amount_in
            new_out = k / new_in
            amount_out = out_reserve - new_out
            self.reserve_b = new_in
            self.reserve_a = new_out
            t_out = self.token_a
        if self.event_bus:
            self.event_bus.publish(
                "token_swap",
                step=0,
                token_in=token_in,
                token_out=t_out,
                amount_in=amount_in,
                amount_out=amount_out,
            )
        return amount_out


class Treasury:
    def __init__(self, event_logger=None, event_bus=None, oracle: PriceOracle | None = None):
        self.tokens = defaultdict(float)
        self._locked_tokens = defaultdict(float)
        # Track prices for all tokens held by the treasury.  The DAO token is
        # initialised with a default price of ``1.0`` so tests don't need to
        # seed a price before using it.
        self.token_prices = {"DAO_TOKEN": 1.0}
        self._revenue = 0.0
        self.event_logger = event_logger
        self.event_bus = event_bus
        self._price_pressure = defaultdict(float)
        self.oracle: PriceOracle = oracle or RandomWalkOracle()
        self.pools: dict[tuple[str, str], LiquidityPool] = {}

    def deposit(self, token, amount, *, step: int = 0):
        self.tokens[token] += amount
        self._price_pressure[token] -= amount
        if self.event_bus:
            self.event_bus.publish("token_deposit", step=step, token=token, amount=amount)
        elif self.event_logger:
            self.event_logger.log(step, "token_deposit", token=token, amount=amount)

    def withdraw(self, token, amount, *, step: int = 0):
        if self.tokens[token] >= amount:
            self.tokens[token] -= amount
            withdrawn = amount
        else:
            withdrawn = self.tokens[token]
            self.tokens[token] = 0
        self._price_pressure[token] += withdrawn
        if self.event_bus:
            self.event_bus.publish("token_withdraw", step=step, token=token, amount=withdrawn)
        elif self.event_logger:
            self.event_logger.log(step, "token_withdraw", token=token, amount=withdrawn)
        return withdrawn

    def lock_tokens(self, token: str, amount: float, *, step: int = 0) -> float:
        """Reserve ``amount`` of ``token`` for future payout."""
        locked = self.withdraw(token, amount, step=step)
        if locked > 0:
            self._locked_tokens[token] += locked
            if self.event_bus:
                self.event_bus.publish(
                    "token_locked", step=step, token=token, amount=locked
                )
            elif self.event_logger:
                self.event_logger.log(step, "token_locked", token=token, amount=locked)
        return locked

    def withdraw_locked(self, token: str, amount: float, *, step: int = 0) -> float:
        """Withdraw from previously locked tokens."""
        if self._locked_tokens[token] >= amount:
            self._locked_tokens[token] -= amount
            withdrawn = amount
        else:
            withdrawn = self._locked_tokens[token]
            self._locked_tokens[token] = 0
        if self.event_bus:
            self.event_bus.publish(
                "token_withdraw_locked", step=step, token=token, amount=withdrawn
            )
        elif self.event_logger:
            self.event_logger.log(step, "token_withdraw_locked", token=token, amount=withdrawn)
        return withdrawn

    def get_locked_balance(self, token: str) -> float:
        return self._locked_tokens[token]

    def update_token_price(self, token, new_price):
        self.token_prices[token] = new_price

    def get_token_price(self, token):
        return self.token_prices.get(token, 0.0)

    def update_prices(self, volatility: float = 0.05) -> None:
        """Delegate price updates to the configured oracle."""
        self.oracle.update_prices(self, volatility=volatility)

    def to_dict(self):
        return {
            "tokens": dict(self.tokens),
            "locked_tokens": dict(self._locked_tokens),
            "token_prices": self.token_prices,
            "_revenue": self._revenue,
            "pools": {
                "|".join(key): {
                    "reserve_a": pool.reserve_a,
                    "reserve_b": pool.reserve_b,
                }
                for key, pool in self.pools.items()
            },
        }

    @classmethod
    def from_dict(cls, data, event_bus=None):
        t = cls(event_bus=event_bus)
        t.tokens = defaultdict(float, data.get("tokens", {}))
        t._locked_tokens = defaultdict(float, data.get("locked_tokens", {}))
        t.token_prices = data.get("token_prices", {"DAO_TOKEN": 1.0})
        t._revenue = data.get("_revenue", 0.0)
        t._price_pressure = defaultdict(float)
        for key, pdata in data.get("pools", {}).items():
            tokens = key.split("|")
            pool = LiquidityPool(tokens[0], tokens[1], event_bus=event_bus)
            pool.reserve_a = pdata.get("reserve_a", 0.0)
            pool.reserve_b = pdata.get("reserve_b", 0.0)
            t.pools[tuple(tokens)] = pool
        return t

    def get_token_value(self, token):
        """Return the total value of ``token`` held by the treasury."""
        return self.tokens[token] * self.get_token_price(token)

    def get_token_balance(self, token):
        return self.tokens[token]

    @property
    def token_balance(self):
        """Total of all token balances."""
        return sum(self.tokens.values())

    @property
    def reputation_balance(self):
        """Placeholder for future reputation accounting."""
        return 0

    @property
    def funds(self):
        return sum(self.tokens.values())

    def add_revenue(self, amount):
        self._revenue += amount

    def get_revenue_amount(self):
        revenue = self._revenue
        self._revenue = 0.0
        return revenue

    # --- Liquidity pool management -------------------------------------------------

    def _get_pool(self, token_a: str, token_b: str, create: bool = False) -> LiquidityPool | None:
        key = tuple(sorted((token_a, token_b)))
        pool = self.pools.get(key)
        if pool is None and create:
            pool = LiquidityPool(key[0], key[1], event_bus=self.event_bus)
            self.pools[key] = pool
        return pool

    def create_pool(self, token_a: str, token_b: str) -> LiquidityPool:
        return self._get_pool(token_a, token_b, create=True)

    def add_liquidity(self, token_a: str, token_b: str, amt_a: float, amt_b: float) -> None:
        pool = self._get_pool(token_a, token_b, create=True)
        self.withdraw(token_a, amt_a)
        self.withdraw(token_b, amt_b)
        pool.add_liquidity(amt_a, amt_b)

    def remove_liquidity(self, token_a: str, token_b: str, share: float) -> tuple[float, float]:
        pool = self._get_pool(token_a, token_b)
        if pool is None:
            return 0.0, 0.0
        amt_a, amt_b = pool.remove_liquidity(share)
        self.deposit(pool.token_a, amt_a)
        self.deposit(pool.token_b, amt_b)
        return amt_a, amt_b

    def swap(self, token_in: str, token_out: str, amount_in: float) -> float:
        pool = self._get_pool(token_in, token_out)
        if pool is None:
            raise ValueError("Pool does not exist")
        self.withdraw(token_in, amount_in)
        amount_out = pool.swap(token_in, amount_in)
        self.deposit(token_out, amount_out)
        return amount_out

