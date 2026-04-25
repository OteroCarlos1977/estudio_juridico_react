const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Database = require("better-sqlite3");

const systemRouter = require("../src/modules/system/system.routes");

const { buildBackupFilename, verifyBackupIntegrity } = systemRouter.__test;

test("buildBackupFilename genera nombres seguros de backup", () => {
  const filename = buildBackupFilename();

  assert.match(filename, /^rollie_backup_\d{8}_\d{6}\.db$/);
  assert.equal(path.basename(filename), filename);
});

test("verifyBackupIntegrity acepta una base SQLite valida", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollie-backup-test-"));
  const filePath = path.join(dir, "valid.db");
  const db = new Database(filePath);
  db.prepare("CREATE TABLE prueba (id INTEGER PRIMARY KEY, nombre TEXT)").run();
  db.prepare("INSERT INTO prueba (nombre) VALUES (?)").run("ok");
  db.close();

  assert.doesNotThrow(() => verifyBackupIntegrity(filePath));
});

test("verifyBackupIntegrity rechaza archivos inexistentes", () => {
  assert.throws(
    () => verifyBackupIntegrity(path.join(os.tmpdir(), "no-existe-rollie.db")),
    /No se pudo crear el archivo de backup/
  );
});
