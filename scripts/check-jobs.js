/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Run from the repo root. Override with `KINETTA_DB=/path/to/motionvid.db`.
const candidates = [
  process.env.KINETTA_DB,
  path.join(process.cwd(), "data", "motionvid.db"),
].filter(Boolean);

for (const p of candidates) {
  console.log("\nDB?", p, "exists=", fs.existsSync(p));
  if (!fs.existsSync(p)) continue;
  const db = new Database(p, { readonly: true });
  const rows = db
    .prepare("SELECT id, status, logs_json, updated_at FROM jobs ORDER BY created_at DESC LIMIT 3")
    .all();
  for (const r of rows) {
    console.log(r.id, r.status, new Date(r.updated_at).toISOString());
    console.log(r.logs_json);
  }
  db.close();
}
