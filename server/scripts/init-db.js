const fs = require("fs/promises");
const path = require("path");
const initSqlJs = require("sql.js");

const databasePath = path.resolve(__dirname, "../prisma/dev.db");

const schemaSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  profile_img TEXT,
  links TEXT,
  status_message TEXT,
  status_message_expires_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date_key TEXT NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  is_studying INTEGER NOT NULL DEFAULT 0,
  last_image TEXT,
  last_active_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date_key)
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  study_log_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (study_log_id) REFERENCES study_logs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_logs_date_key_total_seconds
  ON study_logs(date_key, total_seconds);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id_created_at
  ON snapshots(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id_created_at
  ON reports(reporter_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_target_id_created_at
  ON reports(target_id, created_at);
`;

async function main() {
  const SQL = await initSqlJs();
  let database;

  try {
    const existing = await fs.readFile(databasePath);
    database = new SQL.Database(existing);
  } catch {
    database = new SQL.Database();
  }

  database.exec(schemaSql);
  const data = database.export();
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.writeFile(databasePath, Buffer.from(data));
  console.log(`SQLite database initialized at ${databasePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
