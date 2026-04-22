const express = require("express");
const { z } = require("zod");
const { getDb } = require("../../db/database");

const router = express.Router();

const clientPayloadSchema = z
  .object({
    tipo_persona: z.enum(["fisica", "juridica"]).default("fisica"),
    apellido: z.string().trim().max(120).optional().nullable(),
    nombre: z.string().trim().max(120).optional().nullable(),
    razon_social: z.string().trim().max(180).optional().nullable(),
    dni_cuit: z.string().trim().max(30).optional().nullable(),
    telefono: z.string().trim().max(80).optional().nullable(),
    email: z.string().trim().email().max(180).optional().nullable().or(z.literal("")),
    domicilio: z.string().trim().max(220).optional().nullable(),
    localidad: z.string().trim().max(120).optional().nullable(),
    provincia: z.string().trim().max(120).optional().nullable(),
    codigo_postal: z.string().trim().max(20).optional().nullable(),
    observaciones: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.tipo_persona === "juridica" && !value.razon_social) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["razon_social"],
        message: "La razon social es obligatoria para personas juridicas.",
      });
    }

    if (value.tipo_persona === "fisica" && !value.apellido && !value.nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apellido"],
        message: "Debe cargar apellido o nombre para personas fisicas.",
      });
    }
  });

const clientFields = [
  "tipo_persona",
  "apellido",
  "nombre",
  "razon_social",
  "dni_cuit",
  "telefono",
  "email",
  "domicilio",
  "localidad",
  "provincia",
  "codigo_postal",
  "observaciones",
];

router.get("/", (req, res) => {
  const db = getDb();
  const clients = db
    .prepare(
      `SELECT
        id,
        tipo_persona,
        apellido,
        nombre,
        razon_social,
        dni_cuit,
        telefono,
        email,
        localidad,
        provincia,
        activo
      FROM clientes
      WHERE activo = 1
      ORDER BY apellido COLLATE NOCASE, nombre COLLATE NOCASE, razon_social COLLATE NOCASE
      LIMIT 100`
    )
    .all();

  res.json({ clients });
});

router.get("/:id", (req, res, next) => {
  try {
    const client = findClientById(req.params.id);

    if (!client) {
      throw httpError(404, "CLIENT_NOT_FOUND", "Cliente no encontrado.");
    }

    res.json({ client });
  } catch (err) {
    next(err);
  }
});

router.post("/", (req, res, next) => {
  try {
    const payload = parseClientPayload(req.body);
    const now = currentTimestamp();
    const db = getDb();

    const result = db
      .prepare(
        `INSERT INTO clientes (
          tipo_persona,
          apellido,
          nombre,
          razon_social,
          dni_cuit,
          telefono,
          email,
          domicilio,
          localidad,
          provincia,
          codigo_postal,
          observaciones,
          activo,
          created_at,
          updated_at
        ) VALUES (
          @tipo_persona,
          @apellido,
          @nombre,
          @razon_social,
          @dni_cuit,
          @telefono,
          @email,
          @domicilio,
          @localidad,
          @provincia,
          @codigo_postal,
          @observaciones,
          1,
          @created_at,
          @updated_at
        )`
      )
      .run({
        ...payload,
        created_at: now,
        updated_at: now,
      });

    res.status(201).json({ client: findClientById(result.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw httpError(400, "INVALID_CLIENT_ID", "Id de cliente invalido.");
    }

    const current = findClientById(id);

    if (!current) {
      throw httpError(404, "CLIENT_NOT_FOUND", "Cliente no encontrado.");
    }

    const payload = parseClientPayload(req.body);
    const db = getDb();

    db.prepare(
      `UPDATE clientes
      SET
        tipo_persona = @tipo_persona,
        apellido = @apellido,
        nombre = @nombre,
        razon_social = @razon_social,
        dni_cuit = @dni_cuit,
        telefono = @telefono,
        email = @email,
        domicilio = @domicilio,
        localidad = @localidad,
        provincia = @provincia,
        codigo_postal = @codigo_postal,
        observaciones = @observaciones,
        updated_at = @updated_at
      WHERE id = @id`
    ).run({
      id,
      ...payload,
      updated_at: currentTimestamp(),
    });

    res.json({ client: findClientById(id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw httpError(400, "INVALID_CLIENT_ID", "Id de cliente invalido.");
    }

    const current = findClientById(id);

    if (!current) {
      throw httpError(404, "CLIENT_NOT_FOUND", "Cliente no encontrado.");
    }

    getDb()
      .prepare("UPDATE clientes SET activo = 0, updated_at = @updated_at WHERE id = @id")
      .run({
        id,
        updated_at: currentTimestamp(),
      });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function findClientById(id) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw httpError(400, "INVALID_CLIENT_ID", "Id de cliente invalido.");
  }

  return getDb()
    .prepare(
      `SELECT
        id,
        tipo_persona,
        apellido,
        nombre,
        razon_social,
        dni_cuit,
        telefono,
        email,
        domicilio,
        localidad,
        provincia,
        codigo_postal,
        observaciones,
        activo,
        created_at,
        updated_at
      FROM clientes
      WHERE id = ? AND activo = 1`
    )
    .get(numericId);
}

function parseClientPayload(body) {
  const result = clientPayloadSchema.safeParse(body);

  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de cliente invalidos.", result.error.flatten());
  }

  return normalizeEmptyStrings(result.data);
}

function normalizeEmptyStrings(value) {
  return Object.fromEntries(
    clientFields.map((key) => {
      const item = value[key];
      return [key, item === "" ? null : item ?? null];
    })
  );
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
