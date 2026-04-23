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
    ensureSchemaCompatibility(db);
  }

  return db;
}

function ensureSchemaCompatibility(database) {
  ensureColumn(database, "adjuntos", "activo", "ALTER TABLE adjuntos ADD COLUMN activo INTEGER NOT NULL DEFAULT 1");
  ensureColumn(database, "actuaciones", "activo", "ALTER TABLE actuaciones ADD COLUMN activo INTEGER NOT NULL DEFAULT 1");
  ensureColumn(
    database,
    "movimientos_financieros",
    "activo",
    "ALTER TABLE movimientos_financieros ADD COLUMN activo INTEGER NOT NULL DEFAULT 1"
  );
  ensureColumn(
    database,
    "movimientos_financieros",
    "cuotas_total",
    "ALTER TABLE movimientos_financieros ADD COLUMN cuotas_total INTEGER NOT NULL DEFAULT 1"
  );
  ensureColumn(
    database,
    "movimientos_financieros",
    "cuota_numero",
    "ALTER TABLE movimientos_financieros ADD COLUMN cuota_numero INTEGER NOT NULL DEFAULT 1"
  );
  ensureColumn(
    database,
    "movimientos_financieros",
    "monto_cuota",
    "ALTER TABLE movimientos_financieros ADD COLUMN monto_cuota REAL"
  );
  ensureColumn(
    database,
    "movimientos_financieros",
    "porcentaje_interes",
    "ALTER TABLE movimientos_financieros ADD COLUMN porcentaje_interes REAL"
  );
}

function ensureColumn(database, tableName, columnName, alterSql) {
  const table = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);

  if (!table) {
    return;
  }

  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    database.prepare(alterSql).run();
  }
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
