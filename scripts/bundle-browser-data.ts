/**
 * Bundle Browser Data
 *
 * Reads calibration profiles and market data from results/historical/
 * and bundles them as JSON files in public/data/ for browser consumption.
 *
 * Usage: npx tsx scripts/bundle-browser-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CALIBRATION_DIR = path.join(ROOT, 'results', 'historical', 'calibration');
const MARKET_CSV = path.join(ROOT, 'results', 'historical', 'market', 'market_daily.csv');
const OUTPUT_DIR = path.join(ROOT, 'public', 'data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Bundle calibration profiles
console.log('Bundling calibration profiles...');
const profiles: Record<string, unknown> = {};
const files = fs.readdirSync(CALIBRATION_DIR).filter(f => f.endsWith('_profile.json'));

for (const file of files) {
  const daoId = file.replace('_profile.json', '');
  const content = fs.readFileSync(path.join(CALIBRATION_DIR, file), 'utf-8');
  profiles[daoId] = JSON.parse(content);
}

const profilesJson = JSON.stringify(profiles);
const profilesPath = path.join(OUTPUT_DIR, 'calibration-profiles.json');
fs.writeFileSync(profilesPath, profilesJson, 'utf-8');
console.log(`  → ${profilesPath} (${(profilesJson.length / 1024).toFixed(1)}KB, ${Object.keys(profiles).length} DAOs)`);

// 2. Bundle market time series
console.log('Bundling market time series...');
const marketData: Record<string, Array<{ step: number; price: number }>> = {};

if (fs.existsSync(MARKET_CSV)) {
  const content = fs.readFileSync(MARKET_CSV, 'utf-8');
  const lines = content.split('\n');

  if (lines.length >= 2) {
    const header = lines[0].split(',').map(h => h.trim());
    const daoIdIdx = header.indexOf('dao_id');
    const priceIdx = header.indexOf('price_usd');
    const timestampIdx = header.indexOf('timestamp_utc');

    if (daoIdIdx >= 0 && priceIdx >= 0) {
      // Collect rows per DAO
      const rowsByDao: Record<string, Array<{ timestamp: number; price: number }>> = {};

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length <= Math.max(daoIdIdx, priceIdx)) continue;

        const daoId = cols[daoIdIdx].trim();
        const price = parseFloat(cols[priceIdx].trim());
        const timestamp = timestampIdx >= 0 ? parseInt(cols[timestampIdx].trim()) : i;

        if (!daoId || !isFinite(price) || price <= 0) continue;

        if (!rowsByDao[daoId]) rowsByDao[daoId] = [];
        rowsByDao[daoId].push({ timestamp, price });
      }

      // Convert to step-indexed format (1 day = 24 steps)
      for (const [daoId, rows] of Object.entries(rowsByDao)) {
        rows.sort((a, b) => a.timestamp - b.timestamp);
        marketData[daoId] = rows.map((row, dayIndex) => ({
          step: dayIndex * 24,
          price: row.price,
        }));
      }
    }
  }
}

const marketJson = JSON.stringify(marketData);
const marketPath = path.join(OUTPUT_DIR, 'market-timeseries.json');
fs.writeFileSync(marketPath, marketJson, 'utf-8');
console.log(`  → ${marketPath} (${(marketJson.length / 1024).toFixed(1)}KB, ${Object.keys(marketData).length} DAOs)`);

console.log('Done!');
