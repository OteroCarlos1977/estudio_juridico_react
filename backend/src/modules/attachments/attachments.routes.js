const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { getDb } = require("../../db/database");

const router = express.Router();
const attachmentsDir = path.resolve(__dirname, "../../../../data/adjuntos");
const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".doc", ".docx", ".rtf", ".odt"]);

fs.mkdirSync(attachmentsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: attachmentsDir,
    filename(req, file, callback) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      callback(null, safeName);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(httpError(400, "INVALID_FILE_TYPE", "Formato no permitido. Use PDF, imagen o documento Word/OpenDocument."));
      return;
    }

    callback(null, true);
  },
});

const attachmentPayloadSchema = z.object({
  expediente_id: emptyToNull(z.coerce.number().int().positive().optional().nullable()),
  cliente_id: emptyToNull(z.coerce.number().int().positive().optional().nullable()),
  actuacion_id: emptyToNull(z.coerce.number().int().positive().optional().nullable()),
  movimiento_financiero_id: emptyToNull(z.coerce.number().int().positive().optional().nullable()),
  descripcion: z.string().trim().max(1000).optional().nullable(),
  fecha_documento: z.string().trim().max(20).optional().nullable(),
});

router.get("/", (req, res, next) => {
  try {
    const filters = parseListFilters(req.query);
    const { whereSql, params } = buildListWhere(filters);
    const attachments = getDb()
      .prepare(
        `SELECT
          a.id,
          a.expediente_id,
          a.cliente_id,
          a.actuacion_id,
          a.movimiento_financiero_id,
          a.nombre_original,
          a.nombre_guardado,
          a.extension,
          a.mime_type,
          a.tamano_bytes,
          a.descripcion,
          a.fecha_documento,
          a.created_at,
          e.numero_expediente,
          e.caratula,
          ac.titulo AS actuacion_titulo,
          mf.concepto AS movimiento_concepto,
          COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente
        FROM adjuntos a
        LEFT JOIN expedientes e ON e.id = a.expediente_id
        LEFT JOIN clientes c ON c.id = a.cliente_id
        LEFT JOIN actuaciones ac ON ac.id = a.actuacion_id
        LEFT JOIN movimientos_financieros mf ON mf.id = a.movimiento_financiero_id
        ${whereSql}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT @limit`
      )
      .all(params);

    res.json({ attachments });
  } catch (err) {
    next(err);
  }
});

router.post("/", upload.single("archivo"), (req, res, next) => {
  try {
    if (!req.file) {
      throw httpError(400, "FILE_REQUIRED", "Debe seleccionar un archivo.");
    }

    const payload = parseAttachmentPayload(req.body);
    assertHasAssociation(payload);
    assertAssociations(payload);

    const now = currentTimestamp();
    const extension = path.extname(req.file.originalname || "").replace(".", "").toLowerCase();
    const relativePath = path.join("adjuntos", req.file.filename);
    const result = getDb()
      .prepare(
        `INSERT INTO adjuntos (
          expediente_id,
          cliente_id,
          actuacion_id,
          movimiento_financiero_id,
          empleado_id,
          tipo_documento_id,
          nombre_original,
          nombre_guardado,
          ruta_archivo,
          extension,
          mime_type,
          tamano_bytes,
          descripcion,
          fecha_documento,
          usuario_id,
          created_at,
          activo
        ) VALUES (
          @expediente_id,
          @cliente_id,
          @actuacion_id,
          @movimiento_financiero_id,
          NULL,
          NULL,
          @nombre_original,
          @nombre_guardado,
          @ruta_archivo,
          @extension,
          @mime_type,
          @tamano_bytes,
          @descripcion,
          @fecha_documento,
          NULL,
          @created_at,
          1
        )`
      )
      .run({
        ...payload,
        nombre_original: req.file.originalname,
        nombre_guardado: req.file.filename,
        ruta_archivo: relativePath,
        extension,
        mime_type: req.file.mimetype,
        tamano_bytes: req.file.size,
        created_at: now,
      });

    res.status(201).json({ attachment: findAttachmentById(result.lastInsertRowid) });
  } catch (err) {
    if (req.file?.path) {
      fs.rm(req.file.path, { force: true }, () => {});
    }
    next(err);
  }
});

router.get("/:id/descargar", (req, res, next) => {
  try {
    const attachment = findAttachmentById(req.params.id);
    if (!attachment) {
      throw httpError(404, "ATTACHMENT_NOT_FOUND", "Adjunto no encontrado.");
    }

    const filePath = resolveAttachmentPath(attachment);
    if (!fs.existsSync(filePath)) {
      throw httpError(404, "FILE_NOT_FOUND", "El archivo fisico no existe.");
    }

    res.download(filePath, attachment.nombre_original);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id, "INVALID_ATTACHMENT_ID");
    const attachment = findAttachmentById(id);
    if (!attachment) {
      throw httpError(404, "ATTACHMENT_NOT_FOUND", "Adjunto no encontrado.");
    }

    getDb().prepare("UPDATE adjuntos SET activo = 0 WHERE id = ?").run(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function findAttachmentById(id) {
  const numericId = parseId(id, "INVALID_ATTACHMENT_ID");
  return getDb()
    .prepare(
      `SELECT
        a.*,
        e.numero_expediente,
        e.caratula,
        ac.titulo AS actuacion_titulo,
        mf.concepto AS movimiento_concepto,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente
      FROM adjuntos a
      LEFT JOIN expedientes e ON e.id = a.expediente_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      LEFT JOIN actuaciones ac ON ac.id = a.actuacion_id
      LEFT JOIN movimientos_financieros mf ON mf.id = a.movimiento_financiero_id
      WHERE a.id = ? AND COALESCE(a.activo, 1) = 1`
    )
    .get(numericId);
}

function resolveAttachmentPath(attachment) {
  const storedName = path.basename(attachment.nombre_guardado || attachment.nombre_original || "");
  const candidates = [
    path.join(attachmentsDir, storedName),
    attachment.expediente_id ? path.join(attachmentsDir, `expediente_${attachment.expediente_id}`, storedName) : null,
    attachment.ruta_archivo ? path.resolve(__dirname, "../../../../data", attachment.ruta_archivo) : null,
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function parseListFilters(query) {
  const limit = Number(query.limit || 120);
  return {
    expediente_id: query.expediente_id ? parseId(query.expediente_id, "INVALID_CASE_ID") : null,
    cliente_id: query.cliente_id ? parseId(query.cliente_id, "INVALID_CLIENT_ID") : null,
    limit: Number.isInteger(limit) && limit > 0 && limit <= 300 ? limit : 120,
  };
}

function buildListWhere(filters) {
  const clauses = ["COALESCE(a.activo, 1) = 1"];
  const params = { limit: filters.limit };

  if (filters.expediente_id) {
    clauses.push("(a.expediente_id = @expediente_id OR ac.expediente_id = @expediente_id)");
    params.expediente_id = filters.expediente_id;
  }

  if (filters.cliente_id) {
    clauses.push("a.cliente_id = @cliente_id");
    params.cliente_id = filters.cliente_id;
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

function parseAttachmentPayload(body) {
  const result = attachmentPayloadSchema.safeParse(body);
  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de adjunto invalidos.", result.error.flatten());
  }

  const payload = normalizePayload(result.data);
  if (payload.fecha_documento && !isIsoDate(payload.fecha_documento)) {
    throw httpError(400, "VALIDATION_ERROR", "La fecha del documento debe tener formato AAAA-MM-DD.", {
      fieldErrors: { fecha_documento: ["La fecha del documento debe tener formato AAAA-MM-DD."] },
    });
  }

  return payload;
}

function assertHasAssociation(payload) {
  if (!payload.cliente_id && !payload.expediente_id && !payload.actuacion_id && !payload.movimiento_financiero_id) {
    throw httpError(400, "ASSOCIATION_REQUIRED", "Debe asociar el adjunto a un cliente, expediente, actuacion o movimiento.");
  }
}

function assertAssociations(payload) {
  assertEntity(payload.cliente_id, "clientes", "CLIENT_NOT_FOUND", "El cliente no existe o esta inactivo.");
  assertEntity(payload.expediente_id, "expedientes", "CASE_NOT_FOUND", "El expediente no existe o esta inactivo.");
  assertEntity(payload.actuacion_id, "actuaciones", "ACTION_NOT_FOUND", "La actuacion no existe o esta inactiva.");
  assertEntity(
    payload.movimiento_financiero_id,
    "movimientos_financieros",
    "MOVEMENT_NOT_FOUND",
    "El movimiento no existe o esta inactivo."
  );
}

function assertEntity(id, tableName, code, message) {
  if (!id) {
    return;
  }

  const item = getDb().prepare(`SELECT id FROM ${tableName} WHERE id = ? AND COALESCE(activo, 1) = 1`).get(id);
  if (!item) {
    throw httpError(400, code, message);
  }
}

function normalizePayload(value) {
  return {
    expediente_id: value.expediente_id || null,
    cliente_id: value.cliente_id || null,
    actuacion_id: value.actuacion_id || null,
    movimiento_financiero_id: value.movimiento_financiero_id || null,
    descripcion: normalizeText(value.descripcion),
    fecha_documento: normalizeText(value.fecha_documento),
  };
}

function emptyToNull(schema) {
  return z.preprocess((value) => (value === "" ? null : value), schema);
}

function parseId(id, code) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw httpError(400, code, "Id invalido.");
  }
  return numericId;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
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
