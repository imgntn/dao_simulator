# File: dao_simulation/utils/locations.py
import random

try:
    import pycountry
except ImportError:  # pragma: no cover - handled in tests via mocking
    pycountry = None
    COUNTRIES = ["US", "FR", "ANONYMOUS"]
else:
    COUNTRIES = [country.name for country in pycountry.countries]
    COUNTRIES.append("ANONYMOUS")


def generate_random_location():
    return random.choice(COUNTRIES)
