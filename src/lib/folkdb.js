/**
 * folkdb, server-owned app data hosted by folk.
 *
 * Raw SQL requires the app owner's Folk login. Public visitors use explicitly
 * configured actions through call(action, args). Never implement authentication
 * or private-data filtering in browser code. No database keys reach this bundle.
 *
 * Usage:
 *   import { query, batch } from "./lib/folkdb";
 *   await query("CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
 *   await query("INSERT INTO entries (name, note) VALUES (?, ?)", ["alice", "hi!"]);
 *   const { rows } = await query("SELECT * FROM entries ORDER BY id DESC");
 *   // rows are objects keyed by column name: [{ id: 1, name: "alice", ... }]
 */

// Resolves correctly on both <slug>.folk.com/ and /apphost/<slug>/
// because the served index.html always carries a <base href> tag.
const ENDPOINT = new URL("__folkdata/query", document.baseURI).toString();

async function send(statements) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(Array.isArray(statements) ? { statements } : statements),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `database request failed (${res.status})`);
    error.signInUrl = data.sign_in_url;
    throw error;
  }
  return data.results.map((r) => {
    if (!r.ok) throw new Error(r.error || "database error");
    const rows = r.rows.map((row) =>
      Object.fromEntries(r.cols.map((c, i) => [c, row[i]])),
    );
    return {
      rows,
      affectedRows: r.affected_row_count,
      lastInsertId: r.last_insert_rowid,
    };
  });
}

/**
 * Run one SQL statement. Use `?` placeholders with `args` for any value that
 * comes from user input, never string-interpolate values into the SQL.
 * Returns { rows, affectedRows, lastInsertId }.
 */
export async function query(sql, args = []) {
  const [result] = await send([{ sql, args }]);
  return result;
}

/** Invoke an explicitly configured public or owner action. */
export async function call(action, args = []) {
  const [result] = await send({ action, args });
  return result;
}

// Server caps one request at 10 statements; larger batches are split into
// sequential requests. Statements across chunks are NOT atomic — keep
// related writes within 10 statements if that matters.
const MAX_STATEMENTS_PER_REQUEST = 10;

/**
 * Run several statements, chunked into requests of 10. Each entry is
 * { sql, args? }. Returns an array of results in the same order.
 */
export async function batch(statements) {
  const results = [];
  for (let i = 0; i < statements.length; i += MAX_STATEMENTS_PER_REQUEST) {
    results.push(...(await send(statements.slice(i, i + MAX_STATEMENTS_PER_REQUEST))));
  }
  return results;
}
