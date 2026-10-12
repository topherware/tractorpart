import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
export const cloud = Boolean(process.env.DATABASE_URL);
export const dataDir = path.resolve(process.env.DATA_DIR || "./data");
if ((process.env.VERCEL || process.env.NODE_ENV === "production") && !cloud)
  throw new Error(
    "DATABASE_URL wajib pada produksi. SQLite hanya untuk pengembangan lokal.",
  );
export let db;
const context = new AsyncLocalStorage();
if (cloud) {
  const { default: pg } = await import("pg");
  pg.types.setTypeParser(20, (value) => Number(value));
  const connection = new URL(process.env.DATABASE_URL);
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    connection.searchParams.delete(key);
  const pool = new pg.Pool({
    connectionString: connection.href,
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_CA_CERT
        ? { ca: process.env.DATABASE_CA_CERT.replaceAll("\\n", "\n") }
        : {}),
    },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    query_timeout: 20000,
    allowExitOnIdle: true,
  });
  pool.on("error", () => console.error("database_pool_error"));
  db = { close: () => pool.end(), pool };
} else {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
  db = new DatabaseSync(path.join(dataDir, "tractorpart.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  db.exec(
    fs.readFileSync(new URL("../migrations/001.sql", import.meta.url), "utf8"),
  );
}
// Positional placeholders, ignoring question marks inside SQL string literals.
export function postgresSql(sql) {
  let index = 0,
    quoted = false,
    output = "";
  for (let i = 0; i < sql.length; i++) {
    const character = sql[i];
    if (character === "'") {
      if (quoted && sql[i + 1] === "'") {
        output += "''";
        i++;
        continue;
      }
      quoted = !quoted;
    }
    output += character === "?" && !quoted ? `$${++index}` : character;
  }
  return output;
}
const query = (sql, params) =>
  (context.getStore()?.client || db.pool).query(postgresSql(sql), params);
let localBusy = null;
const localQuery = (action) =>
  localBusy && !context.getStore()?.local ? localBusy.then(action) : action();
export const one = (sql, ...params) =>
  cloud
    ? query(sql, params).then((r) => r.rows[0])
    : localQuery(() => db.prepare(sql).get(...params));
export const all = (sql, ...params) =>
  cloud
    ? query(sql, params).then((r) => r.rows)
    : localQuery(() => db.prepare(sql).all(...params));
export const run = (sql, ...params) =>
  cloud
    ? query(sql, params).then((r) => ({ changes: r.rowCount }))
    : localQuery(() => db.prepare(sql).run(...params));
export const now = () => new Date().toISOString();
export function transaction(fn) {
  if (context.getStore())
    throw new Error("Nested transactions are not supported.");
  if (cloud) return postgresTransaction(fn);
  if (fn.constructor.name !== "AsyncFunction" && !localBusy) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const previous = localBusy;
  let release;
  const gate = (localBusy = new Promise((resolve) => {
    release = resolve;
  }));
  return (async () => {
    if (previous) await previous;
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = await context.run({ local: true }, fn);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      if (localBusy === gate) localBusy = null;
      release();
    }
  })();
}
async function postgresTransaction(fn) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await context.run({ client }, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function identifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value))
    throw new Error("Invalid SQL identifier.");
  return value;
}
export function update(table, id, values) {
  const keys = Object.keys(values).map(identifier);
  return run(
    `UPDATE ${identifier(table)} SET ${keys.map((k) => `${k}=?`).join(",")} WHERE id=?`,
    ...Object.values(values),
    id,
  );
}
export function insert(table, values) {
  const keys = Object.keys(values).map(identifier);
  const sql = `INSERT INTO ${identifier(table)} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  if (cloud)
    return one(sql + " RETURNING id", ...Object.values(values)).then(
      (row) => row.id,
    );
  const result = run(sql, ...Object.values(values));
  return result instanceof Promise
    ? result.then((row) => Number(row.lastInsertRowid))
    : Number(result.lastInsertRowid);
}
