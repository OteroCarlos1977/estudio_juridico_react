const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");
const {
  currentMonthISO,
  currentTimestampSQL,
  isPastISODate,
  isValidISODate,
  lastDayOfMonthISO,
  todayISO,
} = require("../../utils/dateTime");
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
          tm.nombre AS tipo_movimiento,
          tm.slug AS tipo_movimiento_slug,
          cf.nombre AS categoria_financiera,
          m.moneda,
          m.monto,
          COALESCE(m.monto_cuota, m.monto) AS monto_cuota,
          COALESCE(m.cuota_numero, 1) AS cuota_numero,
          COALESCE(m.cuotas_total, 1) AS cuotas_total,
          COALESCE(m.porcentaje_interes, 0) AS porcentaje_interes,
          m.medio_pago,
          m.comprobante_numero
        FROM movimientos_financieros m
        LEFT JOIN tipos_movimiento_financiero tm ON tm.id = m.tipo_movimiento_id
        LEFT JOIN categorias_financieras cf ON cf.id = m.categoria_financiera_id
        LEFT JOIN clientes c ON c.id = m.cliente_id
        LEFT JOIN expedientes e ON e.id = m.expediente_id
        ${whereSql}
        ORDER BY m.fecha_movimiento ASC, m.id ASC`
      )
      .all(params);

    const report = buildFinanceReportModel(rows, filters);

    const filename = `${buildFinanceReportFileBase(filters)}_${filters.desde}_${filters.hasta}.${format}`;
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buildFinancePdfReport(report));
      return;
    }

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildFinanceExcelReport(report));
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
    applySettlementDate(current, payload);
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
  const reportType = normalizeFinanceReportType(query.tipo_reporte);

  return {
    desde: normalizeText(query.fecha_desde) || first,
    hasta: normalizeText(query.fecha_hasta) || lastDayOfMonthISO(month),
    estado_pago: String(query.estado_pago || "todos"),
    tipo_reporte: reportType,
    cliente_id: query.cliente_id ? parseId(query.cliente_id, "INVALID_CLIENT_ID") : null,
    expediente_id: query.expediente_id ? parseId(query.expediente_id, "INVALID_CASE_ID") : null,
  };
}

function normalizeFinanceReportType(value) {
  const reportType = String(value || "general");
  return ["general", "income", "payments", "receivable", "payment_plans"].includes(reportType) ? reportType : "general";
}

function buildFinanceReportWhere(filters) {
  const clauses = ["m.activo = 1"];
  const params = { desde: filters.desde, hasta: filters.hasta };

  if (["receivable", "payment_plans"].includes(filters.tipo_reporte)) {
    clauses.push("COALESCE(NULLIF(m.fecha_vencimiento, ''), m.fecha_movimiento) >= @desde");
    clauses.push("COALESCE(NULLIF(m.fecha_vencimiento, ''), m.fecha_movimiento) <= @hasta");
  } else {
    clauses.push("m.fecha_movimiento >= @desde");
    clauses.push("m.fecha_movimiento <= @hasta");
  }

  if (filters.estado_pago !== "todos") {
    clauses.push("LOWER(m.estado_pago) = LOWER(@estado_pago)");
    params.estado_pago = filters.estado_pago;
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

function buildFinanceReportModel(rows, filters) {
  const reportRows = filters.tipo_reporte === "payment_plans" ? buildPaymentPlanRows(rows) : rows;
  const sections = [
    { key: "payments", title: "Pagos", rows: [], includeInGeneral: true },
    { key: "income", title: "Ingresos", rows: [], includeInGeneral: true },
    { key: "receivable", title: "Por cobrar", rows: [], includeInGeneral: true },
    { key: "overdue", title: "Cobros vencidos", rows: [], includeInGeneral: true },
    { key: "payment_plans", title: "Planes de pago", rows: [], includeInGeneral: false },
  ];
  const sectionMap = new Map(sections.map((section) => [section.key, section]));

  reportRows.forEach((row) => {
    const key = filters.tipo_reporte === "payment_plans" ? classifyPaymentPlanReportRow(row) : classifyFinanceReportRow(row);
    if (filters.tipo_reporte === "receivable" && !["receivable", "overdue"].includes(key)) return;
    if (!["general", "receivable"].includes(filters.tipo_reporte) && filters.tipo_reporte !== key) return;
    sectionMap.get(key).rows.push(row);
  });

  const visibleSections = filters.tipo_reporte === "general"
    ? sections.filter((section) => section.includeInGeneral)
    : filters.tipo_reporte === "receivable"
      ? sections.filter((section) => ["receivable", "overdue"].includes(section.key))
    : sections.filter((section) => section.key === filters.tipo_reporte);
  const normalizedSections = visibleSections.map((section) => ({
    ...section,
    totals: filters.tipo_reporte === "payment_plans" ? buildPaymentPlanTotals(section.rows) : sumByCurrency(section.rows),
  }));
  const incomeTotals = normalizedSections.find((section) => section.key === "income")?.totals || {};
  const paymentTotals = normalizedSections.find((section) => section.key === "payments")?.totals || {};

  return {
    title: buildFinanceReportTitle(filters),
    period: `${filters.desde} al ${filters.hasta}`,
    sections: normalizedSections,
    balance: filters.tipo_reporte === "general" ? calculateBalance(incomeTotals, paymentTotals) : null,
    generatedAt: new Date(),
  };
}

function classifyFinanceReportRow(row) {
  const state = normalizeState(row.estado_pago);
  const slug = String(row.tipo_movimiento_slug || "").toLowerCase();

  if (["gasto", "cuenta_por_pagar"].includes(slug)) {
    return "payments";
  }

  if (["pagado", "cobrado"].includes(state)) {
    return "income";
  }

  if (isReceivableOverdue(row)) {
    return "overdue";
  }

  return "receivable";
}

function classifyPaymentPlanReportRow(row) {
  return Number(row.cuotas_total || 1) > 1 ? "payment_plans" : classifyFinanceReportRow(row);
}

function normalizeState(value) {
  return String(value || "").trim().toLowerCase();
}

function isUnsettledState(state) {
  return !["pagado", "cobrado", "cancelado"].includes(normalizeState(state));
}

function isPastDate(value) {
  if (!value) return false;
  return isPastISODate(String(value).slice(0, 10));
}

function isReceivableOverdue(row) {
  const state = normalizeState(row.estado_pago);
  const dueDate = row.fecha_vencimiento || row.fecha_movimiento;
  return state === "vencido" || (state === "pendiente" && isPastDate(dueDate));
}

function buildPaymentPlanRows(rows) {
  const planRows = rows
    .filter((row) => Number(row.cuotas_total || 1) > 1)
    .map((row) => {
      const state = normalizeState(row.estado_pago);
      const installmentAmount = Number(row.monto_cuota || row.monto || 0);
      const totalInstallments = Number(row.cuotas_total || 1);
      const currentInstallment = Number(row.cuota_numero || 1);
      const paidInstallments = ["pagado", "cobrado"].includes(state) ? 1 : 0;
      const overdueInstallments = isUnsettledState(state) && isPastDate(row.fecha_vencimiento || row.fecha_movimiento) ? 1 : 0;
      const pendingInstallments = isUnsettledState(state) && !overdueInstallments ? 1 : 0;

      return {
        ...row,
        plan_concepto: formatPlanConcept(row.concepto),
        total_plan: Number(row.monto || installmentAmount * totalInstallments || 0),
        monto_pendiente: isUnsettledState(state) ? installmentAmount : 0,
        cuotas_cobradas: paidInstallments,
        cuotas_pendientes: pendingInstallments,
        cuotas_vencidas: overdueInstallments,
        seguimiento_estado: overdueInstallments ? "Vencida" : paidInstallments ? "Cobrada" : "Pendiente",
        progreso_plan: `${currentInstallment}/${totalInstallments}`,
      };
    });

  return planRows.sort((a, b) => {
    const byClient = String(a.cliente || "").localeCompare(String(b.cliente || ""), "es");
    if (byClient !== 0) return byClient;
    const byCase = String(a.expediente || "").localeCompare(String(b.expediente || ""), "es");
    if (byCase !== 0) return byCase;
    return Number(a.cuota_numero || 0) - Number(b.cuota_numero || 0);
  });
}

function buildPaymentPlanTotals(rows) {
  return rows.reduce((totals, row) => {
    const currency = row.moneda || "ARS";
    const current = totals[currency] || {
      total: 0,
      pending: 0,
      collected: 0,
      overdue: 0,
      rows: 0,
      paidInstallments: 0,
      pendingInstallments: 0,
      overdueInstallments: 0,
    };
    const installmentAmount = Number(row.monto_cuota || row.monto || 0);
    current.total += installmentAmount;
    current.pending += Number(row.monto_pendiente || 0);
    if (row.seguimiento_estado === "Cobrada") current.collected += installmentAmount;
    if (row.seguimiento_estado === "Vencida") current.overdue += installmentAmount;
    current.rows += 1;
    current.paidInstallments += Number(row.cuotas_cobradas || 0);
    current.pendingInstallments += Number(row.cuotas_pendientes || 0);
    current.overdueInstallments += Number(row.cuotas_vencidas || 0);
    totals[currency] = current;
    return totals;
  }, {});
}

function formatPlanConcept(value) {
  return String(value || "").replace(/\s+-\s+cuota\s+\d+\s*\/\s*\d+\s*$/i, "").trim();
}

function sumByCurrency(rows) {
  return rows.reduce((totals, row) => {
    const currency = row.moneda || "ARS";
    totals[currency] = Number((Number(totals[currency] || 0) + Number(row.monto_cuota || row.monto || 0)).toFixed(2));
    return totals;
  }, {});
}

function calculateBalance(incomeTotals, paymentTotals) {
  const currencies = new Set([...Object.keys(incomeTotals), ...Object.keys(paymentTotals)]);
  return Array.from(currencies).reduce((balance, currency) => {
    balance[currency] = Number((Number(incomeTotals[currency] || 0) - Number(paymentTotals[currency] || 0)).toFixed(2));
    return balance;
  }, {});
}

function buildFinanceReportTitle(filters) {
  if (filters.tipo_reporte === "income") return "Reporte de Ingresos";
  if (filters.tipo_reporte === "payments") return "Reporte de Pagos";
  if (filters.tipo_reporte === "receivable") return "Reporte por Cobrar";
  if (filters.tipo_reporte === "payment_plans") return "Reporte de Planes de Pago";
  return "Reporte General de Finanzas";
}

function buildFinanceReportFileBase(filters) {
  if (filters.tipo_reporte === "income") return "finanzas_ingresos";
  if (filters.tipo_reporte === "payments") return "finanzas_pagos";
  if (filters.tipo_reporte === "receivable") return "finanzas_por_cobrar";
  if (filters.tipo_reporte === "payment_plans") return "finanzas_planes_de_pago";
  return "finanzas_general";
}

function buildFinanceExcelReport(report) {
  const sectionHtml = report.sections.map((section) => buildFinanceExcelSection(section)).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin: 18px 0 6px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
    th, td { border: 1px solid #999; padding: 6px; font-size: 12px; }
    th { background: #dde3ec; font-weight: bold; }
    .text-cell { mso-number-format: "\\@"; }
    .subtotal td { background: #f3f6fb; font-weight: bold; }
    .balance td { background: #e8f7ee; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${htmlEscape(report.title)}</h1>
  <p>Periodo: ${htmlEscape(report.period)}</p>
  <p>Generado: ${htmlEscape(formatDateTime(report.generatedAt))}</p>
  ${sectionHtml}
  ${buildFinanceExcelBalance(report)}
</body>
</html>`;
}

function buildFinanceExcelSection(section) {
  if (section.key === "payment_plans") {
    return buildPaymentPlansExcelSection(section);
  }

  const rows = section.rows.map((row) => `<tr>
    <td>${htmlEscape(row.fecha_movimiento)}</td>
    <td>${htmlEscape(row.fecha_vencimiento)}</td>
    <td>${htmlEscape(row.concepto)}</td>
    <td>${htmlEscape(row.cliente)}</td>
    <td class="text-cell">${htmlEscape(formatExcelText(formatInstallmentLabel(row)))}</td>
    <td>${htmlEscape(row.estado_pago)}</td>
    <td>${htmlEscape(row.moneda)}</td>
    <td>${formatMoney(row.monto_cuota || row.monto, row.moneda)}</td>
  </tr>`).join("");
  const subtotalRows = Object.entries(section.totals)
    .map(([currency, total]) => `<tr class="subtotal"><td colspan="7">Subtotal ${htmlEscape(section.title)} ${htmlEscape(currency)}</td><td>${formatMoney(total, currency)}</td></tr>`)
    .join("");

  return `<h2>${htmlEscape(section.title)}</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Vencimiento</th><th>Concepto</th><th>Cliente</th><th>Cuota</th><th>Estado</th><th>Moneda</th><th>Monto cuota</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="8">Sin registros.</td></tr>`}${subtotalRows}</tbody>
  </table>`;
}

function buildPaymentPlansExcelSection(section) {
  const rows = section.rows.map((row) => `<tr>
    <td>${htmlEscape(row.cliente)}</td>
    <td>${htmlEscape(row.expediente)}</td>
    <td>${htmlEscape(row.plan_concepto || row.concepto)}</td>
    <td class="text-cell">${htmlEscape(formatExcelText(row.progreso_plan))}</td>
    <td>${htmlEscape(row.fecha_vencimiento)}</td>
    <td>${htmlEscape(row.seguimiento_estado)}</td>
    <td>${formatMoney(row.monto_cuota || row.monto, row.moneda)}</td>
    <td>${formatMoney(row.monto_pendiente, row.moneda)}</td>
  </tr>`).join("");
  const subtotalRows = Object.entries(section.totals)
    .map(([currency, total]) => `<tr class="subtotal"><td colspan="6">Subtotal ${htmlEscape(currency)} - ${total.rows} cuotas | cobradas: ${total.paidInstallments} | pendientes: ${total.pendingInstallments} | vencidas: ${total.overdueInstallments}</td><td>${formatMoney(total.total, currency)}</td><td>${formatMoney(total.pending, currency)}</td></tr>`)
    .join("");

  return `<h2>${htmlEscape(section.title)}</h2>
  <table>
    <thead><tr><th>Cliente</th><th>Expediente</th><th>Concepto</th><th>Cuota</th><th>Vencimiento</th><th>Seguimiento</th><th>Monto cuota</th><th>Pendiente</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="8">Sin planes de pago para el periodo.</td></tr>`}${subtotalRows}</tbody>
  </table>`;
}

function buildFinanceExcelBalance(report) {
  if (!report.balance) return "";
  return `<h2>Balance</h2>
  <table>
    <thead><tr><th>Moneda</th><th>Total ingresos - Total pagos</th></tr></thead>
    <tbody>${Object.entries(report.balance).map(([currency, total]) => `<tr class="balance"><td>${htmlEscape(currency)}</td><td>${formatMoney(total, currency)}</td></tr>`).join("") || `<tr><td colspan="2">Sin balance para el periodo.</td></tr>`}</tbody>
  </table>`;
}

function buildFinancePdfReport(report) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const rowHeight = 20;
  const colWidths = [58, 58, 190, 130, 58, 70, 100];
  const pages = [];
  let currentPage = [];

  function pushLine(line) {
    if (currentPage.length >= 22) {
      pages.push(currentPage);
      currentPage = [];
    }
    currentPage.push(line);
  }

  report.sections.forEach((section) => {
    pushLine({ type: "section", values: [section.title] });
    pushLine({
      type: "header",
      values: section.key === "payment_plans"
        ? ["Vence", "Cuota", "Concepto", "Cliente", "Expte.", "Estado", "Pendiente"]
        : ["Fecha", "Vence", "Concepto", "Cliente", "Cuota", "Estado", "Monto"],
    });
    if (section.rows.length === 0) {
      pushLine({ type: "empty", values: ["Sin registros para esta seccion."] });
    } else {
      section.rows.forEach((row) => {
        pushLine({
          type: "row",
          values: buildFinancePdfRowValues(section, row),
        });
      });
    }
    Object.entries(section.totals).forEach(([currency, total]) => {
      pushLine({ type: "subtotal", values: buildFinanceSubtotalValues(section, currency, total) });
    });
    pushLine({ type: "space", values: [] });
  });
  if (report.balance) {
    pushLine({ type: "section", values: ["Balance"] });
    Object.entries(report.balance).forEach(([currency, total]) => {
      pushLine({ type: "subtotal", values: [`${currency}`, formatMoney(total, currency)] });
    });
  }
  if (currentPage.length > 0) pages.push(currentPage);

  const objects = [];
  const pageObjectNumbers = [];
  const fontObjectNumber = 3;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = null;
  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 4 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    const content = buildFinancePdfPage(report, pageLines, {
      pageWidth,
      pageHeight,
      margin,
      rowHeight,
      colWidths,
      pageIndex,
      pageCount: pages.length,
    });
    objects[pageObjectNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function buildFinancePdfRowValues(section, row) {
  if (section.key === "payment_plans") {
    return [
      row.fecha_vencimiento || "",
      row.progreso_plan || formatInstallmentLabel(row),
      row.plan_concepto || row.concepto || "",
      row.cliente || "",
      row.expediente || "",
      row.seguimiento_estado || row.estado_pago || "",
      formatMoney(row.monto_pendiente, row.moneda),
    ];
  }

  return [
    row.fecha_movimiento || "",
    row.fecha_vencimiento || "",
    row.concepto || "",
    row.cliente || "",
    formatInstallmentLabel(row),
    row.estado_pago || "",
    formatMoney(row.monto_cuota || row.monto, row.moneda),
  ];
}

function buildFinanceSubtotalValues(section, currency, total) {
  if (section.key === "payment_plans") {
    return [
      `Subtotal ${currency} - cobradas ${total.paidInstallments}, pendientes ${total.pendingInstallments}, vencidas ${total.overdueInstallments}`,
      formatMoney(total.pending, currency),
    ];
  }

  return [`Subtotal ${section.title} ${currency}`, formatMoney(total, currency)];
}

function buildFinancePdfPage(report, lines, options) {
  const { pageWidth, pageHeight, margin, rowHeight, colWidths, pageIndex, pageCount } = options;
  const tableWidth = colWidths.reduce((total, width) => total + width, 0);
  let y = pageHeight - margin;
  const commands = [
    "BT",
    "/F1 15 Tf",
    `${margin} ${y} Td`,
    `(${pdfEscape(`${report.title} - ${report.period}`)}) Tj`,
    "ET",
  ];
  y -= 20;
  commands.push("BT", "/F1 8 Tf", `${margin} ${y} Td`, `(Generado: ${pdfEscape(formatDateTime(report.generatedAt))} - Pagina ${pageIndex + 1}/${pageCount}) Tj`, "ET");
  y -= 24;

  lines.forEach((line) => {
    if (line.type === "space") {
      y -= 8;
      return;
    }
    if (line.type === "section") {
      commands.push("0.13 0.20 0.32 rg", `${margin} ${y - 5} ${tableWidth} ${rowHeight} re`, "f");
      commands.push("1 1 1 rg", "BT", "/F1 10 Tf", `${margin + 6} ${y + 2} Td`, `(${pdfEscape(line.values[0])}) Tj`, "ET");
      y -= rowHeight;
      return;
    }
    if (line.type === "empty") {
      commands.push(...drawFinancePdfWideRow(line.values[0], y, margin, tableWidth, rowHeight, false));
      y -= rowHeight;
      return;
    }
    if (line.type === "subtotal") {
      commands.push(...drawFinancePdfSubtotal(line.values, y, margin, tableWidth, rowHeight));
      y -= rowHeight;
      return;
    }
    commands.push(...drawFinancePdfRow(line.values, y, margin, colWidths, rowHeight, line.type === "header"));
    y -= rowHeight;
  });

  return commands.join("\n");
}

function drawFinancePdfRow(values, y, left, colWidths, rowHeight, header) {
  const commands = [];
  if (header) {
    commands.push("0.88 0.91 0.95 rg", `${left} ${y - 5} ${colWidths.reduce((total, width) => total + width, 0)} ${rowHeight} re`, "f");
  }
  commands.push("0 0 0 RG", "0 0 0 rg", "0.6 w");
  let x = left;
  values.forEach((value, index) => {
    commands.push(`${x} ${y - 5} ${colWidths[index]} ${rowHeight} re`, "S");
    commands.push("BT", `/F1 ${header ? 8 : 7} Tf`, `${x + 4} ${y + 2} Td`, `(${pdfEscape(truncatePdfText(value, index === 2 ? 36 : index === 3 ? 24 : 18))}) Tj`, "ET");
    x += colWidths[index];
  });
  return commands;
}

function drawFinancePdfWideRow(value, y, left, width, rowHeight, filled) {
  const commands = ["0 0 0 RG", "0 0 0 rg", "0.6 w"];
  if (filled) commands.push("0.95 0.97 0.99 rg", `${left} ${y - 5} ${width} ${rowHeight} re`, "f");
  commands.push(`${left} ${y - 5} ${width} ${rowHeight} re`, "S");
  commands.push("BT", "/F1 8 Tf", `${left + 5} ${y + 2} Td`, `(${pdfEscape(truncatePdfText(value, 110))}) Tj`, "ET");
  return commands;
}

function drawFinancePdfSubtotal(values, y, left, width, rowHeight) {
  const amountWidth = 150;
  const labelWidth = width - amountWidth;
  const commands = ["0.93 0.96 0.98 rg", `${left} ${y - 5} ${width} ${rowHeight} re`, "f", "0 0 0 RG", "0 0 0 rg", "0.6 w"];
  commands.push(`${left} ${y - 5} ${labelWidth} ${rowHeight} re`, "S");
  commands.push(`${left + labelWidth} ${y - 5} ${amountWidth} ${rowHeight} re`, "S");
  commands.push("BT", "/F1 8 Tf", `${left + 5} ${y + 2} Td`, `(${pdfEscape(truncatePdfText(values[0], 90))}) Tj`, "ET");
  commands.push("BT", "/F1 8 Tf", `${left + labelWidth + 5} ${y + 2} Td`, `(${pdfEscape(truncatePdfText(values[1], 24))}) Tj`, "ET");
  return commands;
}

function truncatePdfText(value, maxLength) {
  const text = normalizePdfText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function normalizePdfText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function pdfEscape(value) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatMoney(amount, currency = "ARS") {
  return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatInstallmentLabel(row) {
  const current = Number(row.cuota_numero || 1);
  const total = Number(row.cuotas_total || 1);
  return total > 1 ? `${current}/${total}` : "Unico";
}

function formatExcelText(value) {
  const text = String(value || "");
  return text ? `\u00a0${text}` : "";
}

function htmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value) {
  return value.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function currentMonth() {
  return currentMonthISO();
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

function applySettlementDate(current, payload) {
  const previousState = normalizeState(current.estado_pago);
  const nextState = normalizeState(payload.estado_pago);
  const wasUnsettled = !["pagado", "cobrado"].includes(previousState);
  const isNowSettled = ["pagado", "cobrado"].includes(nextState);

  if (wasUnsettled && isNowSettled) {
    payload.fecha_movimiento = todayISO();
  }
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
  if (!isValidISODate(value)) {
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
  return currentTimestampSQL();
}

function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

router.__test = {
  applySettlementDate,
  buildFinanceReportModel,
  classifyFinanceReportRow,
  buildPaymentPlanRows,
  buildPaymentPlanTotals,
  currentMonth,
  formatPlanConcept,
  isPastDate,
  parseFinanceReportFilters,
  sumByCurrency,
};

module.exports = router;
