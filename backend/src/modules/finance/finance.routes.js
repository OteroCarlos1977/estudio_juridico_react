const express = require("express");
const { getDb } = require("../../db/database");

const router = express.Router();

router.get("/movimientos", (req, res) => {
  const movements = getDb()
    .prepare(
      `SELECT
        m.id,
        m.expediente_id,
        m.cliente_id,
        m.concepto,
        m.descripcion,
        m.fecha_movimiento,
        m.fecha_vencimiento,
        m.monto,
        m.moneda,
        m.estado_pago,
        m.medio_pago,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente,
        e.numero_expediente
      FROM movimientos_financieros m
      LEFT JOIN clientes c ON c.id = m.cliente_id
      LEFT JOIN expedientes e ON e.id = m.expediente_id
      ORDER BY m.fecha_movimiento DESC, m.id DESC
      LIMIT 120`
    )
    .all();

  res.json({ movements });
});

module.exports = router;
