import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Singleton SQLite handle for auth + app tables (RAG plan §2).
 * File lives under DATA_DIR (default `<cwd>/data`, i.e. `/app/data` in
 * Docker via the `app-data` volume). WAL mode for concurrent readers.
 * Gitignored and dockerignored — never committed, never baked into images.
 */
let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;
  const dir = process.env.DATA_DIR ?? join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const db = new Database(join(dir, "filezconverter.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  instance = db;
  return db;
}
