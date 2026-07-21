/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3");
const db = new Database("data/motionvid.db");
const now = Date.now();
const info = db
  .prepare(
    `UPDATE jobs SET status = 'queued', updated_at = ? WHERE status IN ('queued','directing','preparing_assets','rendering_scenes','composing')`,
  )
  .run(now);
console.log("reset", info.changes, db.prepare("SELECT id, status FROM jobs").all());
