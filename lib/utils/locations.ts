// Location utilities - random location generation
// Port from utils/locations.py

// List of countries (simplified - in production, use a proper library or API)
const COUNTRIES = [
  'United States',
  'France',
  'Germany',
  'United Kingdom',
  'Japan',
  'China',
  'India',
  'Brazil',
  'Canada',
  'Australia',
  'Mexico',
  'South Korea',
  'Spain',
  'Italy',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Singapore',
  'UAE',
  'ANONYMOUS',
];

/**
 * Generate a random location from the list of countries
 */
export function generateRandomLocation(): string {
  return COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
}

/**
 * Get all available locations
 */
export function getAllLocations(): string[] {
  return [...COUNTRIES];
}
