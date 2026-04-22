const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");

const router = express.Router();

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
    estado_expediente: z.string().trim().max(80).default("Activo"),
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

router.get("/", (req, res) => {
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
      WHERE e.activo = 1
      ORDER BY e.updated_at DESC, e.id DESC
      LIMIT 100`
    )
    .all();

  res.json({ cases });
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

function parseCasePayload(body) {
  const result = casePayloadSchema.safeParse(body);
  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de expediente invalidos.", result.error.flatten());
  }
  return normalizePayload(result.data);
}

function normalizePayload(value) {
  return Object.fromEntries(
    caseFields.map((key) => {
      const item = value[key];
      return [key, item === "" ? null : item ?? null];
    })
  );
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
