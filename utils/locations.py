# File: dao_simulation/utils/locations.py
import random
import pycountry

COUNTRIES = [country.name for country in pycountry.countries]
COUNTRIES.append("ANONYMOUS")


def generate_random_location():
    return random.choice(COUNTRIES)
