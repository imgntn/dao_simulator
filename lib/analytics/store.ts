import { Pool } from 'pg';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS analytics_daily (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  category   VARCHAR(20) NOT NULL,
  key        VARCHAR(200) NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1,
  UNIQUE(date, category, key)
);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_daily(date);
`;

const UPSERT_SQL = `
INSERT INTO analytics_daily (date, category, key, count)
VALUES (CURRENT_DATE, $1, $2, 1)
ON CONFLICT (date, category, key)
DO UPDATE SET count = analytics_daily.count + 1
`;

const STATS_SQL = `
SELECT date::text, category, key, count
FROM analytics_daily
WHERE date >= CURRENT_DATE - $1::integer
ORDER BY date DESC, category, key
`;

const CLEANUP_SQL = `
DELETE FROM analytics_daily WHERE date < CURRENT_DATE - $1::integer
`;

let pool: Pool | null = null;
let tableEnsured = false;

function getPool(): Pool | null {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[analytics] DATABASE_URL not set — analytics disabled');
    return null;
  }
  pool = new Pool({ connectionString: url, max: 3 });
  return pool;
}

async function ensureTable(): Promise<boolean> {
  if (tableEnsured) return true;
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(CREATE_TABLE_SQL);
    tableEnsured = true;
    return true;
  } catch (err) {
    console.error('[analytics] Failed to create table:', err);
    return false;
  }
}

export async function increment(category: string, key: string): Promise<void> {
  if (!(await ensureTable())) return;
  try {
    await pool!.query(UPSERT_SQL, [category, key]);
  } catch (err) {
    console.error('[analytics] increment failed:', err);
  }
}

export interface AnalyticsRow {
  date: string;
  category: string;
  key: string;
  count: number;
}

export async function getStats(days = 30): Promise<AnalyticsRow[]> {
  if (!(await ensureTable())) return [];
  try {
    const result = await pool!.query(STATS_SQL, [days]);
    return result.rows as AnalyticsRow[];
  } catch (err) {
    console.error('[analytics] getStats failed:', err);
    return [];
  }
}

export async function cleanup(retentionDays = 90): Promise<number> {
  if (!(await ensureTable())) return 0;
  try {
    const result = await pool!.query(CLEANUP_SQL, [retentionDays]);
    return result.rowCount ?? 0;
  } catch (err) {
    console.error('[analytics] cleanup failed:', err);
    return 0;
  }
}
