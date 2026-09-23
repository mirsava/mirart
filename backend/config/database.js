import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// COUNT()/SUM() come back as bigint; the app expects plain numbers. NUMERIC stays a string.
pg.types.setTypeParser(20, (value) => parseInt(value, 10));

// Tables whose primary key is not an `id` column, so INSERT must not append RETURNING id.
const TABLES_WITHOUT_ID = new Set(['site_settings', 'listing_view_daily']);

const isWriteCommand = (command) => command === 'INSERT' || command === 'UPDATE' || command === 'DELETE';

// Converts `?` placeholders to `$1, $2, ...` (ignoring any inside single-quoted string literals).
export function toPgPlaceholders(sql) {
  let out = '';
  let n = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inString && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inString = !inString;
    }
    out += ch === '?' && !inString ? `$${++n}` : ch;
  }
  return out;
}

function prepare(sql) {
  let text = toPgPlaceholders(sql).trim().replace(/;$/, '');
  const insert = /^\s*INSERT\s+INTO\s+"?(\w+)"?/i.exec(text);
  if (insert && !/\bRETURNING\b/i.test(text) && !TABLES_WITHOUT_ID.has(insert[1].toLowerCase())) {
    text += ' RETURNING id';
  }
  return text;
}

// Mirrors the mysql2 result shape: SELECT -> [rows], INSERT/UPDATE/DELETE -> [{ insertId, affectedRows, rows }].
function shape(result) {
  if (isWriteCommand(result.command)) {
    return [{
      insertId: result.command === 'INSERT' ? result.rows[0]?.id : undefined,
      affectedRows: result.rowCount,
      rows: result.rows,
    }];
  }
  return [result.rows, result.fields];
}

async function run(executor, sql, params = []) {
  const result = await executor.query(prepare(sql), params);
  return shape(result);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err.message);
});

const db = {
  query: (sql, params) => run(pool, sql, params),
  execute: (sql, params) => run(pool, sql, params),
  async getConnection() {
    const client = await pool.connect();
    const query = (sql, params) => run(client, sql, params);
    return {
      query,
      execute: query,
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  },
  end: () => pool.end(),
  raw: pool,
};

export default db;
