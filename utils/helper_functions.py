import random

def weighted_choice(choices, weights):
    """Make a random choice based on a list of choices and corresponding weights."""
    return random.choices(choices, weights=weights, k=1)[0]

def generate_location():
    """Generate a random country code based on the ISO 3166-1 alpha-3 codes."""
    country_codes = [
        "AFG", "ALA", "ALB", "DZA", "ASM", "AND", "AGO", "AIA", "ATA", "ATG",
        # ...
        "WLF", "ESH", "YEM", "ZMB", "ZWE"
    ]
    return random.choice(country_codes)

def generate_anonymous_location():
    """Return 'ANON' to represent an anonymous location."""
    return "ANON"
