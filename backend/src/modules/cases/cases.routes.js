const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");

const router = express.Router();

const allowedCaseStates = ["Activo", "En tramite", "Suspendido", "Archivado", "Cerrado"];

const casePayloadSchema = z
  .object({
    cliente_principal_id: z.coerce.number().int().positive(),
    numero_expediente: z.string().trim().max(80).optional().nullable(),
    caratula: z.string().trim().min(1, "La caratula es obligatoria.").max(220),
    materia: z.string().trim().max(120).optional().nullable(),
    fuero: z.string().trim().max(120).optional().nullable(),
    jurisdiccion: z.string().trim().max(120).optional().nullable(),
    juzgado: z.string().trim().max(160).optional().nullable(),
    secretaria: z.string().trim().max(120).optional().nullable(),
    estado_expediente: z.enum(allowedCaseStates).default("Activo"),
    fecha_inicio: z.string().trim().max(20).optional().nullable(),
    fecha_cierre: z.string().trim().max(20).optional().nullable(),
    descripcion: z.string().trim().max(2000).optional().nullable(),
    observaciones: z.string().trim().max(2000).optional().nullable(),
  });

const caseFields = [
  "cliente_principal_id",
  "numero_expediente",
  "caratula",
  "materia",
  "fuero",
  "jurisdiccion",
  "juzgado",
  "secretaria",
  "estado_expediente",
  "fecha_inicio",
  "fecha_cierre",
  "descripcion",
  "observaciones",
];

router.get("/", (req, res, next) => {
  try {
    const filters = parseCaseFilters(req.query);
    const { whereSql, params } = buildCaseWhere(filters);
    const cases = getDb()
      .prepare(
        `SELECT
          e.id,
          e.cliente_principal_id,
          e.numero_expediente,
          e.caratula,
          e.fuero,
          e.jurisdiccion,
          e.juzgado,
          e.estado_expediente,
          e.fecha_inicio,
          COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente
        FROM expedientes e
        LEFT JOIN clientes c ON c.id = e.cliente_principal_id
        ${whereSql}
        ORDER BY e.updated_at DESC, e.id DESC
        LIMIT @limit`
      )
      .all(params);

    res.json({ cases });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    const caseItem = findCaseById(req.params.id);
    if (!caseItem) {
      throw httpError(404, "CASE_NOT_FOUND", "Expediente no encontrado.");
    }
    res.json({ case: caseItem });
  } catch (err) {
    next(err);
  }
});

router.post("/", (req, res, next) => {
  try {
    const payload = parseCasePayload(req.body);
    assertActiveClient(payload.cliente_principal_id);
    assertUniqueCaseNumber(payload.numero_expediente);
    const now = currentTimestamp();
    const result = getDb()
      .prepare(
        `INSERT INTO expedientes (
          cliente_principal_id,
          numero_expediente,
          caratula,
          materia,
          fuero,
          jurisdiccion,
          juzgado,
          secretaria,
          estado_expediente,
          fecha_inicio,
          fecha_cierre,
          descripcion,
          observaciones,
          usuario_responsable_id,
          activo,
          created_at,
          updated_at
        ) VALUES (
          @cliente_principal_id,
          @numero_expediente,
          @caratula,
          @materia,
          @fuero,
          @jurisdiccion,
          @juzgado,
          @secretaria,
          @estado_expediente,
          @fecha_inicio,
          @fecha_cierre,
          @descripcion,
          @observaciones,
          NULL,
          1,
          @created_at,
          @updated_at
        )`
      )
      .run({ ...payload, created_at: now, updated_at: now });

    res.status(201).json({ case: findCaseById(result.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findCaseById(id);
    if (!current) {
      throw httpError(404, "CASE_NOT_FOUND", "Expediente no encontrado.");
    }

    const payload = parseCasePayload(req.body);
    assertActiveClient(payload.cliente_principal_id);
    assertUniqueCaseNumber(payload.numero_expediente, id);

    getDb()
      .prepare(
        `UPDATE expedientes
        SET
          cliente_principal_id = @cliente_principal_id,
          numero_expediente = @numero_expediente,
          caratula = @caratula,
          materia = @materia,
          fuero = @fuero,
          jurisdiccion = @jurisdiccion,
          juzgado = @juzgado,
          secretaria = @secretaria,
          estado_expediente = @estado_expediente,
          fecha_inicio = @fecha_inicio,
          fecha_cierre = @fecha_cierre,
          descripcion = @descripcion,
          observaciones = @observaciones,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({ id, ...payload, updated_at: currentTimestamp() });

    res.json({ case: findCaseById(id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findCaseById(id);
    if (!current) {
      throw httpError(404, "CASE_NOT_FOUND", "Expediente no encontrado.");
    }

    assertCaseCanBeDeleted(id);

    getDb()
      .prepare("UPDATE expedientes SET activo = 0, updated_at = @updated_at WHERE id = @id")
      .run({ id, updated_at: currentTimestamp() });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function findCaseById(id) {
  const numericId = parseId(id);
  return getDb()
    .prepare(
      `SELECT
        e.*,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente
      FROM expedientes e
      LEFT JOIN clientes c ON c.id = e.cliente_principal_id
      WHERE e.id = ? AND e.activo = 1`
    )
    .get(numericId);
}

function assertActiveClient(clientId) {
  const client = getDb().prepare("SELECT id FROM clientes WHERE id = ? AND activo = 1").get(clientId);
  if (!client) {
    throw httpError(400, "CLIENT_NOT_FOUND", "El cliente principal no existe o esta inactivo.");
  }
}

function assertUniqueCaseNumber(caseNumber, currentId) {
  const normalizedCaseNumber = normalizeText(caseNumber);
  if (!normalizedCaseNumber) {
    return;
  }

  const duplicate = getDb()
    .prepare(
      `SELECT id
      FROM expedientes
      WHERE activo = 1
        AND LOWER(TRIM(numero_expediente)) = LOWER(TRIM(@numero_expediente))
        AND (@current_id IS NULL OR id <> @current_id)
      LIMIT 1`
    )
    .get({ numero_expediente: normalizedCaseNumber, current_id: currentId || null });

  if (duplicate) {
    throw httpError(409, "DUPLICATE_CASE_NUMBER", "Ya existe un expediente activo con ese numero.", {
      fieldErrors: { numero_expediente: ["Ya existe un expediente activo con ese numero."] },
    });
  }
}

function assertCaseCanBeDeleted(caseId) {
  const activeActions = getDb()
    .prepare("SELECT COUNT(*) AS total FROM actuaciones WHERE expediente_id = ? AND activo = 1")
    .get(caseId).total;
  const activeMovements = getDb()
    .prepare("SELECT COUNT(*) AS total FROM movimientos_financieros WHERE expediente_id = ? AND activo = 1")
    .get(caseId).total;

  if (activeActions > 0 || activeMovements > 0) {
    throw httpError(409, "CASE_HAS_ASSOCIATIONS", "No se puede eliminar un expediente con actuaciones o movimientos activos.", {
      activeActions,
      activeMovements,
    });
  }
}

function parseCasePayload(body) {
  const result = casePayloadSchema.safeParse(body);
  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de expediente invalidos.", result.error.flatten());
  }
  const payload = normalizePayload(result.data);
  validateCaseDates(payload);
  return payload;
}

function normalizePayload(value) {
  return Object.fromEntries(
    caseFields.map((key) => {
      const item = value[key];
      return [key, item === "" ? null : item ?? null];
    })
  );
}

function validateCaseDates(payload) {
  const fieldErrors = {};
  if (payload.fecha_inicio && !isIsoDate(payload.fecha_inicio)) {
    fieldErrors.fecha_inicio = ["La fecha de inicio debe tener formato AAAA-MM-DD."];
  }
  if (payload.fecha_cierre && !isIsoDate(payload.fecha_cierre)) {
    fieldErrors.fecha_cierre = ["La fecha de cierre debe tener formato AAAA-MM-DD."];
  }
  if (payload.fecha_inicio && payload.fecha_cierre && payload.fecha_cierre < payload.fecha_inicio) {
    fieldErrors.fecha_cierre = ["La fecha de cierre no puede ser anterior a la fecha de inicio."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de expediente invalidos.", { fieldErrors });
  }
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function parseCaseFilters(query) {
  const limit = Number(query.limit);
  const filters = {
    q: normalizeText(query.q),
    cliente_id: query.cliente_id ? parseId(query.cliente_id) : null,
    estado: normalizeText(query.estado),
    fuero: normalizeText(query.fuero),
    fecha_desde: normalizeText(query.fecha_desde),
    fecha_hasta: normalizeText(query.fecha_hasta),
    limit: Number.isInteger(limit) && limit > 0 && limit <= 300 ? limit : 100,
  };

  if (filters.estado && filters.estado !== "todos" && !allowedCaseStates.includes(filters.estado)) {
    throw httpError(400, "INVALID_CASE_STATE", "Estado de expediente invalido.");
  }

  if (filters.fecha_desde && !isIsoDate(filters.fecha_desde)) {
    throw httpError(400, "INVALID_DATE", "La fecha desde debe tener formato AAAA-MM-DD.");
  }

  if (filters.fecha_hasta && !isIsoDate(filters.fecha_hasta)) {
    throw httpError(400, "INVALID_DATE", "La fecha hasta debe tener formato AAAA-MM-DD.");
  }

  if (filters.fecha_desde && filters.fecha_hasta && filters.fecha_hasta < filters.fecha_desde) {
    throw httpError(400, "INVALID_DATE_RANGE", "La fecha hasta no puede ser anterior a la fecha desde.");
  }

  return filters;
}

function buildCaseWhere(filters) {
  const clauses = ["e.activo = 1"];
  const params = { limit: filters.limit };

  if (filters.q) {
    clauses.push(
      `(LOWER(COALESCE(e.numero_expediente, '')) LIKE @q
        OR LOWER(COALESCE(e.caratula, '')) LIKE @q
        OR LOWER(COALESCE(c.razon_social, '')) LIKE @q
        OR LOWER(COALESCE(c.apellido, '') || ' ' || COALESCE(c.nombre, '')) LIKE @q)`
    );
    params.q = `%${filters.q.toLowerCase()}%`;
  }

  if (filters.cliente_id) {
    clauses.push("e.cliente_principal_id = @cliente_id");
    params.cliente_id = filters.cliente_id;
  }

  if (filters.estado && filters.estado !== "todos") {
    clauses.push("e.estado_expediente = @estado");
    params.estado = filters.estado;
  }

  if (filters.fuero) {
    clauses.push("LOWER(COALESCE(e.fuero, '')) LIKE @fuero");
    params.fuero = `%${filters.fuero.toLowerCase()}%`;
  }

  if (filters.fecha_desde) {
    clauses.push("e.fecha_inicio >= @fecha_desde");
    params.fecha_desde = filters.fecha_desde;
  }

  if (filters.fecha_hasta) {
    clauses.push("e.fecha_inicio <= @fecha_hasta");
    params.fecha_hasta = filters.fecha_hasta;
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function parseId(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw httpError(400, "INVALID_CASE_ID", "Id de expediente invalido.");
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
