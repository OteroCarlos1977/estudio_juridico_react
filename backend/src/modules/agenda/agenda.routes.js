const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");
const { buildPdfReport } = require("../../reportUtils");

const router = express.Router();

const allowedClasses = ["agenda", "tarea", "vencimiento", "audiencia", "presentacion", "otro"];
const allowedStates = ["pendiente", "en_proceso", "vencida", "finalizada", "cancelada"];

const actionPayloadSchema = z
  .object({
    expediente_id: z.coerce.number().int().positive(),
    clase_actuacion: z.enum(allowedClasses).default("agenda"),
    titulo: z.string().trim().max(180).optional().nullable(),
    descripcion: z.string().trim().min(1, "La descripcion es obligatoria.").max(2000),
    fecha_evento: z.string().trim().max(20).optional().nullable(),
    hora_evento: z.string().trim().max(10).optional().nullable(),
    fecha_vencimiento: z.string().trim().max(20).optional().nullable(),
    prioridad: z.string().trim().max(40).optional().nullable(),
    cumplida: z.coerce.boolean().default(false),
    estado_actuacion: z.enum(allowedStates).default("pendiente"),
    resultado_cierre: z.string().trim().max(1000).optional().nullable(),
    observaciones: z.string().trim().max(2000).optional().nullable(),
    dias_alerta: z.coerce.number().int().min(0).max(365).default(3),
  })
  .superRefine((value, ctx) => {
    validateDate(value.fecha_evento, "fecha_evento", ctx);
    validateDate(value.fecha_vencimiento, "fecha_vencimiento", ctx);

    if (value.clase_actuacion === "agenda" && !value.hora_evento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hora_evento"],
        message: "La agenda requiere horario.",
      });
    }

    if (!value.fecha_evento && !value.fecha_vencimiento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fecha_vencimiento"],
        message: "Debe cargar fecha de evento o vencimiento.",
      });
    }
  });

const actionFields = [
  "expediente_id",
  "clase_actuacion",
  "titulo",
  "descripcion",
  "fecha_evento",
  "hora_evento",
  "fecha_vencimiento",
  "prioridad",
  "cumplida",
  "estado_actuacion",
  "resultado_cierre",
  "observaciones",
  "dias_alerta",
];

router.get("/", (req, res, next) => {
  try {
    refreshOverdueActions();
    const filters = parseListFilters(req.query);
    const { whereSql, params } = buildListWhere(filters);

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
          a.fecha_cumplimiento,
          a.prioridad,
          a.cumplida,
          a.estado_actuacion,
          a.resultado_cierre,
          a.observaciones,
          a.dias_alerta,
          e.numero_expediente,
          e.caratula,
          e.cliente_principal_id
        FROM actuaciones a
        LEFT JOIN expedientes e ON e.id = a.expediente_id
        ${whereSql}
        ORDER BY COALESCE(a.fecha_vencimiento, a.fecha_evento, a.created_at) ASC, a.id ASC
        LIMIT @limit`
      )
      .all(params);

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/reportes/agenda.pdf", (req, res, next) => {
  try {
    refreshOverdueActions();
    const range = buildAgendaReportRange(req.query);
    const rows = getDb()
      .prepare(
        `SELECT
          COALESCE(a.fecha_vencimiento, a.fecha_evento, '') AS fecha,
          CASE WHEN a.clase_actuacion = 'agenda' THEN COALESCE(a.hora_evento, '') ELSE '' END AS hora,
          COALESCE(e.numero_expediente, e.caratula, '') AS expediente,
          COALESCE(a.titulo, a.descripcion) AS titulo
        FROM actuaciones a
        LEFT JOIN expedientes e ON e.id = a.expediente_id
        WHERE a.activo = 1
          AND a.cumplida = 0
          AND COALESCE(a.fecha_vencimiento, a.fecha_evento) >= @desde
          AND COALESCE(a.fecha_vencimiento, a.fecha_evento) <= @hasta
          AND (
            @tipo_item = 'todos'
            OR (@tipo_item = 'agenda' AND a.clase_actuacion = 'agenda')
            OR (@tipo_item = 'tarea' AND a.clase_actuacion <> 'agenda')
          )
        ORDER BY COALESCE(a.fecha_vencimiento, a.fecha_evento) ASC, COALESCE(a.hora_evento, '') ASC, a.id ASC`
      )
      .all(range);

    const pdf = buildAgendaPdfReport({
      title: buildAgendaReportTitle(range),
      headers: ["fecha", "hora", "expediente", "titulo"],
      rows,
      generatedAt: new Date(),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="agenda_${range.desde}_${range.hasta}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    refreshOverdueActions();
    const action = findActionById(req.params.id);
    if (!action) {
      throw httpError(404, "ACTION_NOT_FOUND", "Actuacion no encontrada.");
    }
    res.json({ action });
  } catch (err) {
    next(err);
  }
});

router.post("/", (req, res, next) => {
  try {
    const payload = parseActionPayload(req.body);
    assertActiveCase(payload.expediente_id);
    const now = currentTimestamp();
    const result = getDb()
      .prepare(
        `INSERT INTO actuaciones (
          expediente_id,
          tipo_actuacion_id,
          clase_actuacion,
          titulo,
          descripcion,
          fecha_evento,
          hora_evento,
          fecha_vencimiento,
          fecha_cumplimiento,
          prioridad,
          cumplida,
          estado_actuacion,
          resultado_cierre,
          observaciones,
          usuario_responsable_id,
          dias_alerta,
          activo,
          created_at,
          updated_at
        ) VALUES (
          @expediente_id,
          NULL,
          @clase_actuacion,
          @titulo,
          @descripcion,
          @fecha_evento,
          @hora_evento,
          @fecha_vencimiento,
          @fecha_cumplimiento,
          @prioridad,
          @cumplida,
          @estado_actuacion,
          @resultado_cierre,
          @observaciones,
          NULL,
          @dias_alerta,
          1,
          @created_at,
          @updated_at
        )`
      )
      .run({ ...payload, created_at: now, updated_at: now });

    res.status(201).json({ action: findActionById(result.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findActionById(id);
    if (!current) {
      throw httpError(404, "ACTION_NOT_FOUND", "Actuacion no encontrada.");
    }

    const payload = parseActionPayload(req.body);
    assertActiveCase(payload.expediente_id);

    getDb()
      .prepare(
        `UPDATE actuaciones
        SET
          expediente_id = @expediente_id,
          clase_actuacion = @clase_actuacion,
          titulo = @titulo,
          descripcion = @descripcion,
          fecha_evento = @fecha_evento,
          hora_evento = @hora_evento,
          fecha_vencimiento = @fecha_vencimiento,
          fecha_cumplimiento = @fecha_cumplimiento,
          prioridad = @prioridad,
          cumplida = @cumplida,
          estado_actuacion = @estado_actuacion,
          resultado_cierre = @resultado_cierre,
          observaciones = @observaciones,
          dias_alerta = @dias_alerta,
          updated_at = @updated_at
        WHERE id = @id AND activo = 1`
      )
      .run({ id, ...payload, updated_at: currentTimestamp() });

    res.json({ action: findActionById(id) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/cumplida", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findActionById(id);
    if (!current) {
      throw httpError(404, "ACTION_NOT_FOUND", "Actuacion no encontrada.");
    }

    const completed = req.body?.cumplida !== false;
    getDb()
      .prepare(
        `UPDATE actuaciones
        SET
          cumplida = @cumplida,
          estado_actuacion = @estado_actuacion,
          fecha_cumplimiento = @fecha_cumplimiento,
          updated_at = @updated_at
        WHERE id = @id AND activo = 1`
      )
      .run({
        id,
        cumplida: completed ? 1 : 0,
        estado_actuacion: completed ? "finalizada" : "pendiente",
        fecha_cumplimiento: completed ? currentDate() : null,
        updated_at: currentTimestamp(),
      });

    res.json({ action: findActionById(id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findActionById(id);
    if (!current) {
      throw httpError(404, "ACTION_NOT_FOUND", "Actuacion no encontrada.");
    }

    getDb()
      .prepare("UPDATE actuaciones SET activo = 0, updated_at = @updated_at WHERE id = @id")
      .run({ id, updated_at: currentTimestamp() });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function findActionById(id) {
  const numericId = parseId(id);
  return getDb()
    .prepare(
      `SELECT
        a.*,
        e.numero_expediente,
        e.caratula,
        e.cliente_principal_id
      FROM actuaciones a
      LEFT JOIN expedientes e ON e.id = a.expediente_id
      WHERE a.id = ? AND a.activo = 1`
    )
    .get(numericId);
}

function refreshOverdueActions() {
  getDb()
    .prepare(
      `UPDATE actuaciones
      SET
        estado_actuacion = 'vencida',
        updated_at = @updated_at
      WHERE activo = 1
        AND cumplida = 0
        AND estado_actuacion IN ('pendiente', 'en_proceso')
        AND COALESCE(fecha_vencimiento, fecha_evento) IS NOT NULL
        AND COALESCE(fecha_vencimiento, fecha_evento) <> ''
        AND COALESCE(fecha_vencimiento, fecha_evento) < date('now')`
    )
    .run({ updated_at: currentTimestamp() });
}

function parseListFilters(query) {
  const limit = Number(query.limit || 120);
  return {
    expediente_id: query.expediente_id ? parseId(query.expediente_id, "INVALID_CASE_ID") : null,
    estado: String(query.estado || "todos"),
    tipo: String(query.tipo || "todos"),
    limit: Number.isInteger(limit) && limit > 0 && limit <= 300 ? limit : 120,
  };
}

function buildListWhere(filters) {
  const clauses = ["a.activo = 1"];
  const params = { limit: filters.limit };

  if (filters.expediente_id) {
    clauses.push("a.expediente_id = @expediente_id");
    params.expediente_id = filters.expediente_id;
  }

  if (filters.estado === "cumplidas") {
    clauses.push("a.cumplida = 1");
  } else if (filters.estado === "vencidas") {
    clauses.push(
      "a.cumplida = 0 AND a.fecha_vencimiento IS NOT NULL AND a.fecha_vencimiento <> '' AND a.fecha_vencimiento < date('now')"
    );
  } else if (filters.estado === "proximas") {
    clauses.push(
      "a.cumplida = 0 AND a.fecha_vencimiento IS NOT NULL AND a.fecha_vencimiento <> '' AND a.fecha_vencimiento BETWEEN date('now') AND date('now', '+14 day')"
    );
  } else if (filters.estado === "pendientes") {
    clauses.push("a.cumplida = 0");
  }

  if (filters.tipo === "agenda") {
    clauses.push("a.clase_actuacion = @tipo");
    params.tipo = filters.tipo;
  } else if (filters.tipo === "tarea") {
    clauses.push("a.clase_actuacion <> 'agenda'");
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

function buildAgendaReportRange(query) {
  const today = new Date();
  const type = String(query.tipo || "diaria");
  const month = String(query.mes || "").match(/^\d{4}-\d{2}$/) ? String(query.mes) : null;

  if (month) {
    const first = new Date(`${month}-01T00:00:00`);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const start = first < today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : first;
    return { desde: formatDate(start), hasta: formatDate(last), tipo: type, tipo_item: normalizeReportItemType(query.tipo_item), label: `Mes de ${formatMonthLabel(first)}` };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  if (type === "semanal") {
    end.setDate(start.getDate() + 6);
  } else if (type === "quincenal") {
    end.setDate(start.getDate() + 14);
  } else if (type === "mensual") {
    return {
      desde: formatDate(start),
      hasta: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      tipo: type,
      tipo_item: normalizeReportItemType(query.tipo_item),
      label: `Mes de ${formatMonthLabel(today)}`,
    };
  }

  return { desde: formatDate(start), hasta: formatDate(end), tipo: type, tipo_item: normalizeReportItemType(query.tipo_item), label: buildRangeLabel(type, start, end) };
}

function normalizeReportItemType(value) {
  return value === "agenda" || value === "tarea" ? value : "todos";
}

function buildAgendaReportTitle(range) {
  return `Consultorio Juridico Rollie - Agenda ${range.label}`;
}

function buildRangeLabel(type, start, end) {
  if (type === "semanal") return `Semana de ${formatDisplayDate(start)} a ${formatDisplayDate(end)}`;
  if (type === "quincenal") return `Quincena de ${formatDisplayDate(start)} a ${formatDisplayDate(end)}`;
  return `Dia ${formatDisplayDate(start)}`;
}

function formatMonthLabel(value) {
  return value.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function formatDisplayDate(value) {
  return value.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildAgendaPdfReport(report) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const rowHeight = 22;
  const colWidths = [90, 60, 210, 410];
  const rowsPerPage = 18;
  const pages = [];
  for (let index = 0; index < Math.max(report.rows.length, 1); index += rowsPerPage) {
    pages.push(report.rows.slice(index, index + rowsPerPage));
  }

  const objects = [];
  const pageObjectNumbers = [];
  const fontObjectNumber = 3;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = null;
  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageRows, pageIndex) => {
    const pageObjectNumber = 4 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    const content = buildAgendaPdfPage(report, pageRows, { pageWidth, pageHeight, margin, rowHeight, colWidths, pageIndex, pageCount: pages.length });
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

function buildAgendaPdfPage(report, rows, options) {
  const { pageWidth, pageHeight, margin, rowHeight, colWidths, pageIndex, pageCount } = options;
  const left = margin;
  let y = pageHeight - margin;
  const commands = [
    "BT",
    "/F1 16 Tf",
    `${left} ${y} Td`,
    `(${pdfEscape(report.title)}) Tj`,
    "ET",
  ];
  y -= 26;
  commands.push("BT", "/F1 9 Tf", `${left} ${y} Td`, `(Generado: ${pdfEscape(formatDisplayDate(report.generatedAt || new Date()))} - Pagina ${pageIndex + 1}/${pageCount}) Tj`, "ET");
  y -= 28;
  commands.push("0.88 0.91 0.95 rg", `${left} ${y - 5} ${pageWidth - margin * 2} ${rowHeight} re`, "f");
  commands.push(...drawAgendaRow(["Fecha", "Hora", "Expediente", "Titulo"], y, left, colWidths, true));
  y -= rowHeight;

  const visibleRows = rows.length ? rows : [{ fecha: "", hora: "", expediente: "", titulo: "Sin registros para el periodo seleccionado." }];
  visibleRows.forEach((row, index) => {
    if (index % 2 === 1) {
      commands.push("0.97 0.98 0.99 rg", `${left} ${y - 5} ${pageWidth - margin * 2} ${rowHeight} re`, "f");
    }
    commands.push(...drawAgendaRow([row.fecha, row.hora, row.expediente, row.titulo], y, left, colWidths, false));
    y -= rowHeight;
  });
  return commands.join("\n");
}

function drawAgendaRow(values, y, left, colWidths, header) {
  const commands = ["0 0 0 RG", "0 0 0 rg", "0.75 w"];
  let x = left;
  values.forEach((value, index) => {
    commands.push(`${x} ${y - 5} ${colWidths[index]} 22 re`, "S");
    commands.push("0 0 0 rg");
    commands.push("BT", `/F1 ${header ? 9 : 8} Tf`, `${x + 5} ${y + 2} Td`, `(${pdfEscape(truncatePdfText(value, index === 3 ? 72 : 34))}) Tj`, "ET");
    x += colWidths[index];
  });
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

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

function assertActiveCase(caseId) {
  const caseItem = getDb().prepare("SELECT id FROM expedientes WHERE id = ? AND activo = 1").get(caseId);
  if (!caseItem) {
    throw httpError(400, "CASE_NOT_FOUND", "El expediente no existe o esta inactivo.");
  }
}

function parseActionPayload(body) {
  const result = actionPayloadSchema.safeParse(body);
  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de actuacion invalidos.", result.error.flatten());
  }

  const normalized = normalizePayload(result.data);
  if (normalized.clase_actuacion === "agenda") {
    normalized.fecha_evento = normalized.fecha_vencimiento || normalized.fecha_evento;
  } else if (normalized.clase_actuacion === "tarea") {
    normalized.fecha_evento = null;
    normalized.hora_evento = null;
  }
  if (!normalized.descripcion) {
    normalized.descripcion = normalized.titulo || "Tarea";
  }
  normalized.cumplida = normalized.cumplida ? 1 : 0;
  normalized.fecha_cumplimiento = normalized.cumplida ? currentDate() : null;
  if (normalized.cumplida && normalized.estado_actuacion === "pendiente") {
    normalized.estado_actuacion = "finalizada";
  }
  if (!normalized.cumplida && isPastActionDate(normalized)) {
    normalized.estado_actuacion = "vencida";
  }
  return normalized;
}

function isPastActionDate(action) {
  const date = action.fecha_vencimiento || action.fecha_evento || "";
  return Boolean(date) && date < currentDate();
}

function normalizePayload(value) {
  return Object.fromEntries(
    actionFields.map((key) => {
      const item = value[key];
      return [key, item === "" ? null : item ?? null];
    })
  );
}

function validateDate(value, path, ctx) {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00`))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: "La fecha debe tener formato valido.",
    });
  }
}

function parseId(id, code = "INVALID_ACTION_ID") {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw httpError(400, code, "Id invalido.");
  }
  return numericId;
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
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

router.__test = {
  parseActionPayload,
  isPastActionDate,
};

module.exports = router;
