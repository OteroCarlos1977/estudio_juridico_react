const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");
const { buildExcelReport, buildPdfReport } = require("../../reportUtils");

const router = express.Router();

const allowedPaymentStates = ["Pendiente", "Pagado", "Vencido", "Cancelado", "Cobrado"];

const movementPayloadSchema = z.object({
  expediente_id: z.coerce.number().int().positive().optional().nullable(),
  cliente_id: z.coerce.number().int().positive().optional().nullable(),
  tipo_movimiento_id: z.coerce.number().int().positive().default(1),
  categoria_financiera_id: z.coerce.number().int().positive().optional().nullable(),
  concepto: z.string().trim().min(1, "El concepto es obligatorio.").max(180),
  descripcion: z.string().trim().max(2000).optional().nullable(),
  fecha_movimiento: z.string().trim().min(1, "La fecha es obligatoria.").max(20),
  fecha_vencimiento: z.string().trim().max(20).optional().nullable(),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
  cuotas_total: z.coerce.number().int().min(1).max(12).default(1),
  cuota_numero: z.coerce.number().int().min(1).max(12).default(1),
  monto_cuota: z.coerce.number().positive().optional().nullable(),
  porcentaje_interes: z.coerce.number().min(0).max(200).optional().nullable(),
  moneda: z.string().trim().min(1).max(12).default("ARS"),
  estado_pago: z.enum(allowedPaymentStates).default("Pendiente"),
  medio_pago: z.string().trim().max(80).optional().nullable(),
  comprobante_numero: z.string().trim().max(120).optional().nullable(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

const movementFields = [
  "expediente_id",
  "cliente_id",
  "tipo_movimiento_id",
  "categoria_financiera_id",
  "concepto",
  "descripcion",
  "fecha_movimiento",
  "fecha_vencimiento",
  "monto",
  "cuotas_total",
  "cuota_numero",
  "monto_cuota",
  "porcentaje_interes",
  "moneda",
  "estado_pago",
  "medio_pago",
  "comprobante_numero",
  "observaciones",
];

router.get("/catalogos", (req, res, next) => {
  try {
    const db = getDb();
    const movementTypes = db
      .prepare(
        `SELECT id, nombre, slug
        FROM tipos_movimiento_financiero
        WHERE activo = 1
        ORDER BY nombre ASC`
      )
      .all();

    const categories = db
      .prepare(
        `SELECT c.id, c.nombre, c.tipo_movimiento_id, tm.slug AS tipo_movimiento_slug
        FROM categorias_financieras c
        LEFT JOIN tipos_movimiento_financiero tm ON tm.id = c.tipo_movimiento_id
        WHERE c.activo = 1
        ORDER BY c.nombre ASC`
      )
      .all();

    res.json({ movementTypes, categories });
  } catch (err) {
    next(err);
  }
});

router.get("/movimientos", (req, res, next) => {
  try {
    const filters = parseListFilters(req.query);
    const { whereSql, params } = buildListWhere(filters);
    const db = getDb();
    const movements = db
      .prepare(
        `SELECT
          m.id,
          m.expediente_id,
          m.cliente_id,
          m.tipo_movimiento_id,
          tm.nombre AS tipo_movimiento,
          tm.slug AS tipo_movimiento_slug,
          m.categoria_financiera_id,
          cf.nombre AS categoria_financiera,
          m.concepto,
          m.descripcion,
          m.fecha_movimiento,
          m.fecha_vencimiento,
          m.monto,
          COALESCE(m.cuotas_total, 1) AS cuotas_total,
          COALESCE(m.cuota_numero, 1) AS cuota_numero,
          m.monto_cuota,
          m.porcentaje_interes,
          m.moneda,
          m.estado_pago,
          m.medio_pago,
          m.comprobante_numero,
          m.observaciones,
          COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente,
          e.numero_expediente,
          e.caratula
        FROM movimientos_financieros m
        LEFT JOIN tipos_movimiento_financiero tm ON tm.id = m.tipo_movimiento_id
        LEFT JOIN categorias_financieras cf ON cf.id = m.categoria_financiera_id
        LEFT JOIN clientes c ON c.id = m.cliente_id
        LEFT JOIN expedientes e ON e.id = m.expediente_id
        ${whereSql}
        ORDER BY m.fecha_movimiento DESC, m.id DESC
        LIMIT @limit`
      )
      .all(params);

    const totals = db
      .prepare(
        `SELECT
          m.moneda,
          m.estado_pago,
          SUM(m.monto) AS total,
          COUNT(*) AS cantidad
        FROM movimientos_financieros m
        LEFT JOIN clientes c ON c.id = m.cliente_id
        LEFT JOIN expedientes e ON e.id = m.expediente_id
        ${whereSql}
        GROUP BY m.moneda, m.estado_pago
        ORDER BY m.moneda, m.estado_pago`
      )
      .all(params);

    res.json({ movements, totals });
  } catch (err) {
    next(err);
  }
});

router.get("/reportes/finanzas.:formato", (req, res, next) => {
  try {
    const format = String(req.params.formato || "").toLowerCase();
    if (!["xls", "pdf"].includes(format)) {
      throw httpError(404, "REPORT_FORMAT_NOT_FOUND", "Formato de reporte no disponible.");
    }

    const filters = parseFinanceReportFilters(req.query);
    const { whereSql, params } = buildFinanceReportWhere(filters);
    const rows = getDb()
      .prepare(
        `SELECT
          m.fecha_movimiento,
          m.fecha_vencimiento,
          m.concepto,
          COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente,
          COALESCE(e.numero_expediente, e.caratula, '') AS expediente,
          m.estado_pago,
          m.moneda,
          m.monto,
          COALESCE(m.monto_cuota, m.monto) AS monto_cuota,
          COALESCE(m.cuota_numero, 1) AS cuota_numero,
          COALESCE(m.cuotas_total, 1) AS cuotas_total,
          COALESCE(m.porcentaje_interes, 0) AS porcentaje_interes,
          m.medio_pago,
          m.comprobante_numero
        FROM movimientos_financieros m
        LEFT JOIN clientes c ON c.id = m.cliente_id
        LEFT JOIN expedientes e ON e.id = m.expediente_id
        ${whereSql}
        ORDER BY m.fecha_movimiento ASC, m.id ASC`
      )
      .all(params);

    const report = {
      title: `Finanzas ${filters.desde} al ${filters.hasta}`,
      headers: [
        "fecha_movimiento",
        "fecha_vencimiento",
        "concepto",
        "cliente",
        "expediente",
        "estado_pago",
        "moneda",
        "monto",
        "monto_cuota",
        "cuota_numero",
        "cuotas_total",
        "porcentaje_interes",
        "medio_pago",
        "comprobante_numero",
      ],
      rows,
      generatedAt: new Date(),
    };

    const filename = `finanzas_${filters.desde}_${filters.hasta}.${format}`;
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buildPdfReport(report));
      return;
    }

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildExcelReport(report));
  } catch (err) {
    next(err);
  }
});

router.get("/movimientos/:id", (req, res, next) => {
  try {
    const movement = findMovementById(req.params.id);
    if (!movement) {
      throw httpError(404, "MOVEMENT_NOT_FOUND", "Movimiento no encontrado.");
    }
    res.json({ movement });
  } catch (err) {
    next(err);
  }
});

router.post("/movimientos", (req, res, next) => {
  try {
    const payload = parseMovementPayload(req.body);
    assertRelations(payload);
    const now = currentTimestamp();
    const result = getDb()
      .prepare(
        `INSERT INTO movimientos_financieros (
          expediente_id,
          cliente_id,
          empleado_id,
          liquidacion_id,
          tipo_movimiento_id,
          categoria_financiera_id,
          concepto,
          descripcion,
          fecha_movimiento,
          fecha_vencimiento,
          monto,
          cuotas_total,
          cuota_numero,
          monto_cuota,
          porcentaje_interes,
          moneda,
          estado_pago,
          medio_pago,
          comprobante_numero,
          observaciones,
          usuario_id,
          activo,
          created_at,
          updated_at
        ) VALUES (
          @expediente_id,
          @cliente_id,
          NULL,
          NULL,
          @tipo_movimiento_id,
          @categoria_financiera_id,
          @concepto,
          @descripcion,
          @fecha_movimiento,
          @fecha_vencimiento,
          @monto,
          @cuotas_total,
          @cuota_numero,
          @monto_cuota,
          @porcentaje_interes,
          @moneda,
          @estado_pago,
          @medio_pago,
          @comprobante_numero,
          @observaciones,
          NULL,
          1,
          @created_at,
          @updated_at
        )`
      )
      .run({ ...payload, created_at: now, updated_at: now });

    res.status(201).json({ movement: findMovementById(result.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put("/movimientos/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findMovementById(id);
    if (!current) {
      throw httpError(404, "MOVEMENT_NOT_FOUND", "Movimiento no encontrado.");
    }

    const payload = parseMovementPayload(req.body);
    assertRelations(payload);

    getDb()
      .prepare(
        `UPDATE movimientos_financieros
        SET
          expediente_id = @expediente_id,
          cliente_id = @cliente_id,
          tipo_movimiento_id = @tipo_movimiento_id,
          categoria_financiera_id = @categoria_financiera_id,
          concepto = @concepto,
          descripcion = @descripcion,
          fecha_movimiento = @fecha_movimiento,
          fecha_vencimiento = @fecha_vencimiento,
          monto = @monto,
          cuotas_total = @cuotas_total,
          cuota_numero = @cuota_numero,
          monto_cuota = @monto_cuota,
          porcentaje_interes = @porcentaje_interes,
          moneda = @moneda,
          estado_pago = @estado_pago,
          medio_pago = @medio_pago,
          comprobante_numero = @comprobante_numero,
          observaciones = @observaciones,
          updated_at = @updated_at
        WHERE id = @id AND activo = 1`
      )
      .run({ id, ...payload, updated_at: currentTimestamp() });

    res.json({ movement: findMovementById(id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/movimientos/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findMovementById(id);
    if (!current) {
      throw httpError(404, "MOVEMENT_NOT_FOUND", "Movimiento no encontrado.");
    }

    getDb()
      .prepare("UPDATE movimientos_financieros SET activo = 0, updated_at = @updated_at WHERE id = @id")
      .run({ id, updated_at: currentTimestamp() });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function findMovementById(id) {
  const numericId = parseId(id);
  return getDb()
    .prepare(
      `SELECT
        m.*,
        COALESCE(m.cuotas_total, 1) AS cuotas_total,
        COALESCE(m.cuota_numero, 1) AS cuota_numero,
        m.porcentaje_interes,
        tm.nombre AS tipo_movimiento,
        tm.slug AS tipo_movimiento_slug,
        cf.nombre AS categoria_financiera,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente,
        e.numero_expediente,
        e.caratula
      FROM movimientos_financieros m
      LEFT JOIN tipos_movimiento_financiero tm ON tm.id = m.tipo_movimiento_id
      LEFT JOIN categorias_financieras cf ON cf.id = m.categoria_financiera_id
      LEFT JOIN clientes c ON c.id = m.cliente_id
      LEFT JOIN expedientes e ON e.id = m.expediente_id
      WHERE m.id = ? AND m.activo = 1`
    )
    .get(numericId);
}

function parseListFilters(query) {
  const limit = Number(query.limit || 120);
  return {
    cliente_id: query.cliente_id ? parseId(query.cliente_id, "INVALID_CLIENT_ID") : null,
    expediente_id: query.expediente_id ? parseId(query.expediente_id, "INVALID_CASE_ID") : null,
    estado_pago: String(query.estado_pago || "todos"),
    fecha_desde: normalizeText(query.fecha_desde),
    fecha_hasta: normalizeText(query.fecha_hasta),
    limit: Number.isInteger(limit) && limit > 0 && limit <= 300 ? limit : 120,
  };
}

function buildListWhere(filters) {
  const clauses = ["m.activo = 1"];
  const params = { limit: filters.limit };

  if (filters.cliente_id) {
    clauses.push("m.cliente_id = @cliente_id");
    params.cliente_id = filters.cliente_id;
  }

  if (filters.expediente_id) {
    clauses.push("m.expediente_id = @expediente_id");
    params.expediente_id = filters.expediente_id;
  }

  if (filters.estado_pago !== "todos") {
    clauses.push("LOWER(m.estado_pago) = LOWER(@estado_pago)");
    params.estado_pago = filters.estado_pago;
  }

  if (filters.fecha_desde) {
    clauses.push("m.fecha_movimiento >= @fecha_desde");
    params.fecha_desde = filters.fecha_desde;
  }

  if (filters.fecha_hasta) {
    clauses.push("m.fecha_movimiento <= @fecha_hasta");
    params.fecha_hasta = filters.fecha_hasta;
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

function parseFinanceReportFilters(query) {
  const month = String(query.mes || currentMonth()).match(/^\d{4}-\d{2}$/)?.[0] || currentMonth();
  const first = `${month}-01`;
  const lastDate = new Date(`${month}-01T00:00:00`);
  lastDate.setMonth(lastDate.getMonth() + 1);
  lastDate.setDate(0);

  return {
    desde: normalizeText(query.fecha_desde) || first,
    hasta: normalizeText(query.fecha_hasta) || lastDate.toISOString().slice(0, 10),
    estado_pago: String(query.estado_pago || "todos"),
    vencimiento: String(query.vencimiento || "todos"),
    cliente_id: query.cliente_id ? parseId(query.cliente_id, "INVALID_CLIENT_ID") : null,
    expediente_id: query.expediente_id ? parseId(query.expediente_id, "INVALID_CASE_ID") : null,
  };
}

function buildFinanceReportWhere(filters) {
  const clauses = ["m.activo = 1"];
  const params = { desde: filters.desde, hasta: filters.hasta };

  clauses.push("m.fecha_movimiento >= @desde");
  clauses.push("m.fecha_movimiento <= @hasta");

  if (filters.estado_pago !== "todos") {
    clauses.push("LOWER(m.estado_pago) = LOWER(@estado_pago)");
    params.estado_pago = filters.estado_pago;
  }

  if (filters.vencimiento === "actuales_anteriores") {
    clauses.push("m.fecha_vencimiento IS NOT NULL AND m.fecha_vencimiento <> '' AND m.fecha_vencimiento <= date('now')");
  } else if (filters.vencimiento === "futuros") {
    clauses.push("m.fecha_vencimiento IS NOT NULL AND m.fecha_vencimiento <> '' AND m.fecha_vencimiento > date('now')");
  }

  if (filters.cliente_id) {
    clauses.push("m.cliente_id = @cliente_id");
    params.cliente_id = filters.cliente_id;
  }

  if (filters.expediente_id) {
    clauses.push("m.expediente_id = @expediente_id");
    params.expediente_id = filters.expediente_id;
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseMovementPayload(body) {
  const normalizedBody = Object.fromEntries(
    Object.entries(body || {}).map(([key, value]) => [key, value === "" ? null : value])
  );
  const result = movementPayloadSchema.safeParse(normalizedBody);
  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de movimiento invalidos.", result.error.flatten());
  }

  const normalized = normalizePayload(result.data);
  validateDate(normalized.fecha_movimiento, "fecha_movimiento");
  validateDate(normalized.fecha_vencimiento, "fecha_vencimiento");
  validateInstallments(normalized);
  normalized.moneda = String(normalized.moneda || "ARS").toUpperCase();
  return normalized;
}

function validateInstallments(payload) {
  payload.cuotas_total = payload.cuotas_total || 1;
  payload.cuota_numero = payload.cuota_numero || 1;

  if (payload.cuota_numero > payload.cuotas_total) {
    throw httpError(400, "VALIDATION_ERROR", "El numero de cuota no puede superar el total de cuotas.", {
      fieldErrors: { cuota_numero: ["El numero de cuota no puede superar el total de cuotas."] },
    });
  }

  if (payload.porcentaje_interes === null || payload.porcentaje_interes === undefined) {
    payload.porcentaje_interes = getDefaultInstallmentRate(payload.cuotas_total) * 100;
  }

  payload.monto_cuota = calculateInstallmentAmount(payload.monto, payload.cuotas_total, payload.porcentaje_interes);
}

function calculateInstallmentAmount(amount, totalInstallments, interestPercentage) {
  const principal = Number(amount || 0);
  const installments = Number(totalInstallments || 1);
  const rate = Number(interestPercentage || 0) / 100;
  const financedTotal = principal * (1 + rate);
  return Number((financedTotal / installments).toFixed(2));
}

function getDefaultInstallmentRate(totalInstallments) {
  const installments = Number(totalInstallments || 1);
  if (installments === 3) return 0.05;
  if (installments >= 4 && installments <= 6) return 0.08;
  if (installments >= 7 && installments <= 9) return 0.1;
  if (installments >= 10 && installments <= 12) return 0.15;
  return 0;
}

function assertRelations(payload) {
  if (payload.cliente_id) {
    const client = getDb().prepare("SELECT id FROM clientes WHERE id = ? AND activo = 1").get(payload.cliente_id);
    if (!client) {
      throw httpError(400, "CLIENT_NOT_FOUND", "El cliente no existe o esta inactivo.");
    }
  }

  if (payload.expediente_id) {
    const caseItem = getDb().prepare("SELECT id FROM expedientes WHERE id = ? AND activo = 1").get(payload.expediente_id);
    if (!caseItem) {
      throw httpError(400, "CASE_NOT_FOUND", "El expediente no existe o esta inactivo.");
    }
  }
}

function normalizePayload(value) {
  return Object.fromEntries(
    movementFields.map((key) => {
      const item = value[key];
      return [key, item === "" ? null : item ?? null];
    })
  );
}

function normalizeText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function validateDate(value, field) {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00`))) {
    throw httpError(400, "VALIDATION_ERROR", `Fecha invalida en ${field}.`);
  }
}

function parseId(id, code = "INVALID_MOVEMENT_ID") {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw httpError(400, code, "Id invalido.");
  }
  return numericId;
}

function currentTimestamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

module.exports = router;
