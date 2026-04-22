const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.resolve(__dirname, "../../../data");
const defaultDatabasePath = path.join(dataDir, "estudio_juridico_v28.db");
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : defaultDatabasePath;

let db;

function ensureDataDirectory() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getDb() {
  if (!db) {
    ensureDataDirectory();
    db = new Database(databasePath);
    db.pragma("foreign_keys = ON");
  }

  return db;
}

function getDatabaseInfo() {
  const exists = fs.existsSync(databasePath);

  return {
    path: databasePath,
    exists,
    sizeBytes: exists ? fs.statSync(databasePath).size : 0,
  };
}

module.exports = {
  getDb,
  getDatabaseInfo,
};
