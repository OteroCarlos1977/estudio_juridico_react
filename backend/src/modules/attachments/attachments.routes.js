const express = require("express");
const { getDb } = require("../../db/database");

const router = express.Router();

router.get("/", (req, res) => {
  const attachments = getDb()
    .prepare(
      `SELECT
        a.id,
        a.expediente_id,
        a.cliente_id,
        a.nombre_original,
        a.extension,
        a.tamano_bytes,
        a.descripcion,
        a.fecha_documento,
        a.created_at,
        e.numero_expediente,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente
      FROM adjuntos a
      LEFT JOIN expedientes e ON e.id = a.expediente_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 120`
    )
    .all();

  res.json({ attachments });
});

module.exports = router;
