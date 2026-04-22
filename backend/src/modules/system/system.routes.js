const express = require("express");
const { getDb } = require("../../db/database");

const router = express.Router();

router.get("/usuarios", (req, res) => {
  const users = getDb()
    .prepare(
      `SELECT
        u.id,
        u.username,
        COALESCE(u.nombre_completo, TRIM(COALESCE(u.apellido, '') || ', ' || COALESCE(u.nombre, ''))) AS nombre,
        u.email,
        u.activo,
        GROUP_CONCAT(r.nombre, ', ') AS roles
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id
      WHERE COALESCE(u.es_sistema, 0) = 0
      GROUP BY u.id
      ORDER BY u.username COLLATE NOCASE`
    )
    .all();

  res.json({ users });
});

router.get("/auditoria", (req, res) => {
  const audit = getDb()
    .prepare(
      `SELECT id, usuario_id, tabla_afectada, registro_id, accion, descripcion, fecha_hora
      FROM auditoria
      ORDER BY fecha_hora DESC, id DESC
      LIMIT 100`
    )
    .all();

  res.json({ audit });
});

router.get("/reportes/resumen", (req, res) => {
  const db = getDb();
  const totals = {
    clientes: countRows(db, "clientes", "activo = 1"),
    expedientes: countRows(db, "expedientes", "activo = 1"),
    actuaciones: countRows(db, "actuaciones"),
    movimientos: countRows(db, "movimientos_financieros"),
    adjuntos: countRows(db, "adjuntos"),
  };

  res.json({ totals });
});

router.get("/backups", (req, res) => {
  const backups = getDb()
    .prepare("SELECT id, archivo, fecha, usuario FROM historial_backups ORDER BY fecha DESC, id DESC LIMIT 100")
    .all();

  res.json({ backups });
});

function countRows(db, tableName, whereClause) {
  const sql = whereClause
    ? `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${whereClause}`
    : `SELECT COUNT(*) AS total FROM ${tableName}`;
  return db.prepare(sql).get().total;
}

module.exports = router;
