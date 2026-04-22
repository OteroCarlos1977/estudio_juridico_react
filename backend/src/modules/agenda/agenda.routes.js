const express = require("express");
const { getDb } = require("../../db/database");

const router = express.Router();

router.get("/", (req, res) => {
  const items = getDb()
    .prepare(
      `SELECT
        a.id,
        a.expediente_id,
        a.clase_actuacion,
        COALESCE(a.titulo, a.descripcion) AS titulo,
        a.descripcion,
        a.fecha_evento,
        a.hora_evento,
        a.fecha_vencimiento,
        a.prioridad,
        a.cumplida,
        a.estado_actuacion,
        e.numero_expediente,
        e.caratula
      FROM actuaciones a
      LEFT JOIN expedientes e ON e.id = a.expediente_id
      ORDER BY COALESCE(a.fecha_vencimiento, a.fecha_evento, a.created_at) ASC
      LIMIT 120`
    )
    .all();

  res.json({ items });
});

module.exports = router;
