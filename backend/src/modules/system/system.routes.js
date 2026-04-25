const fs = require("fs");
const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");
const { z } = require("zod");
const { getDb } = require("../../db/database");
const { requireRole } = require("../../auth/auth.middleware");
const { buildPasswordFields } = require("../../auth/auth.service");

const router = express.Router();
const backupDir = path.resolve(__dirname, "../../../../data/backups");

fs.mkdirSync(backupDir, { recursive: true });

router.use(requireRole("Administrador"));

const userSchema = z.object({
  username: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres.").max(80),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal("")),
  nombre: z.string().trim().max(100).optional().nullable(),
  apellido: z.string().trim().max(100).optional().nullable(),
  nombre_completo: z.string().trim().max(180).optional().nullable(),
  email: z.string().trim().email("Email invalido.").optional().nullable().or(z.literal("")),
  rol_id: z.coerce.number().int().positive(),
  activo: z.coerce.boolean().default(true),
});

router.get("/usuarios", (req, res) => {
  const users = listUsers();
  res.json({ users });
});

router.get("/roles", (req, res) => {
  const roles = getDb()
    .prepare("SELECT id, nombre, descripcion FROM roles WHERE activo = 1 ORDER BY nombre")
    .all();
  res.json({ roles });
});

router.post("/usuarios", requireRole("Administrador"), async (req, res, next) => {
  try {
    const payload = parseUserPayload(req.body, true);
    assertUniqueUsername(payload.username);
    assertActiveRole(payload.rol_id);
    const passwordFields = await buildPasswordFields(payload.password);
    const now = currentTimestamp();
    const result = getDb()
      .prepare(
        `INSERT INTO usuarios (
          username,
          password_hash,
          password_salt,
          nombre,
          apellido,
          nombre_completo,
          email,
          activo,
          es_sistema,
          created_at,
          updated_at
        ) VALUES (
          @username,
          @password_hash,
          @password_salt,
          @nombre,
          @apellido,
          @nombre_completo,
          @email,
          @activo,
          0,
          @created_at,
          @updated_at
        )`
      )
      .run({ ...payload, ...passwordFields, activo: payload.activo ? 1 : 0, created_at: now, updated_at: now });

    assignRole(result.lastInsertRowid, payload.rol_id);
    res.status(201).json({ user: findUserById(result.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.put("/usuarios/:id", requireRole("Administrador"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findUserById(id);
    if (!current) {
      throw httpError(404, "USER_NOT_FOUND", "Usuario no encontrado.");
    }

    const payload = parseUserPayload(req.body, false);
    assertUniqueUsername(payload.username, id);
    assertActiveRole(payload.rol_id);
    const passwordFields = payload.password ? await buildPasswordFields(payload.password) : {};
    const passwordSql = payload.password ? ", password_hash = @password_hash, password_salt = @password_salt" : "";

    getDb()
      .prepare(
        `UPDATE usuarios
        SET
          username = @username,
          nombre = @nombre,
          apellido = @apellido,
          nombre_completo = @nombre_completo,
          email = @email,
          activo = @activo,
          updated_at = @updated_at
          ${passwordSql}
        WHERE id = @id AND COALESCE(es_sistema, 0) = 0`
      )
      .run({ id, ...payload, ...passwordFields, activo: payload.activo ? 1 : 0, updated_at: currentTimestamp() });

    assignRole(id, payload.rol_id);
    res.json({ user: findUserById(id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/usuarios/:id", requireRole("Administrador"), (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = findUserById(id);
    if (!current) {
      throw httpError(404, "USER_NOT_FOUND", "Usuario no encontrado.");
    }

    getDb()
      .prepare("UPDATE usuarios SET activo = 0, updated_at = @updated_at WHERE id = @id AND COALESCE(es_sistema, 0) = 0")
      .run({ id, updated_at: currentTimestamp() });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/auditoria", (req, res) => {
  const audit = getDb()
    .prepare(
      `SELECT id, usuario_id, tabla_afectada, registro_id, accion, descripcion, fecha_hora
      FROM auditoria
      ORDER BY fecha_hora DESC, id DESC
      LIMIT 100`
    )
    .all();

  res.json({ audit });
});

router.get("/reportes/resumen", (req, res) => {
  const db = getDb();
  const totals = {
    clientes: countRows(db, "clientes", "activo = 1"),
    expedientes: countRows(db, "expedientes", "activo = 1"),
    actuaciones: countRows(db, "actuaciones"),
    movimientos: countRows(db, "movimientos_financieros"),
    adjuntos: countRows(db, "adjuntos"),
  };

  res.json({ totals });
});

router.get("/reportes/:tipo.csv", (req, res, next) => {
  try {
    const report = buildReport(req.params.tipo);
    const filename = `${req.params.tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildCsvReport(report));
  } catch (err) {
    next(err);
  }
});

router.get("/reportes/:tipo.xls", (req, res, next) => {
  try {
    const report = buildReport(req.params.tipo);
    const filename = `${req.params.tipo}_${new Date().toISOString().slice(0, 10)}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildExcelReport(report));
  } catch (err) {
    next(err);
  }
});

router.get("/reportes/:tipo.pdf", (req, res, next) => {
  try {
    const report = buildReport(req.params.tipo);
    const filename = `${req.params.tipo}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdf = buildPdfReport(report);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get("/backups", (req, res) => {
  const backups = getDb()
    .prepare("SELECT id, archivo, fecha, usuario FROM historial_backups ORDER BY fecha DESC, id DESC LIMIT 100")
    .all();

  res.json({ backups });
});

router.post("/backups", requireRole("Administrador"), async (req, res, next) => {
  try {
    const db = getDb();
    const filename = buildBackupFilename();
    const filePath = path.join(backupDir, filename);
    const createdAt = currentTimestamp();
    const username = req.user?.username || "sistema";

    await db.backup(filePath);
    verifyBackupIntegrity(filePath);

    const result = db
      .prepare("INSERT INTO historial_backups (archivo, fecha, usuario) VALUES (@archivo, @fecha, @usuario)")
      .run({
        archivo: filename,
        fecha: createdAt,
        usuario: username,
      });

    res.status(201).json({
      backup: {
        id: result.lastInsertRowid,
        archivo: filename,
        fecha: createdAt,
        usuario: username,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/backups/:archivo/descargar", requireRole("Administrador"), (req, res, next) => {
  try {
    const filename = path.basename(req.params.archivo);
    const backup = getDb().prepare("SELECT archivo FROM historial_backups WHERE archivo = ?").get(filename);
    if (!backup) {
      throw httpError(404, "BACKUP_NOT_FOUND", "Backup no encontrado.");
    }

    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      throw httpError(404, "BACKUP_FILE_NOT_FOUND", "El archivo de backup no existe.");
    }

    res.download(filePath, filename);
  } catch (err) {
    next(err);
  }
});

function buildBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_");
  return `rollie_backup_${timestamp}.db`;
}

function verifyBackupIntegrity(filePath) {
  if (!fs.existsSync(filePath)) {
    throw httpError(500, "BACKUP_NOT_CREATED", "No se pudo crear el archivo de backup.");
  }

  const backupDb = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const result = backupDb.prepare("PRAGMA integrity_check").get();
    const value = Object.values(result || {})[0];
    if (value !== "ok") {
      throw httpError(500, "BACKUP_INTEGRITY_ERROR", "El backup fue creado pero no paso la verificacion de integridad.");
    }
  } finally {
    backupDb.close();
  }
}

function listUsers() {
  return getDb()
    .prepare(
      `SELECT
        u.id,
        u.username,
        COALESCE(u.nombre_completo, TRIM(COALESCE(u.apellido, '') || ', ' || COALESCE(u.nombre, ''))) AS nombre,
        u.nombre AS nombre_simple,
        u.apellido,
        u.nombre_completo,
        u.email,
        u.activo,
        r.id AS rol_id,
        GROUP_CONCAT(r.nombre, ', ') AS roles
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id
      WHERE COALESCE(u.es_sistema, 0) = 0
      GROUP BY u.id
      ORDER BY u.username COLLATE NOCASE`
    )
    .all();
}

function findUserById(id) {
  return listUsers().find((user) => user.id === Number(id));
}

function parseUserPayload(body, requirePassword) {
  const result = userSchema.safeParse(body);
  if (!result.success) {
    throw httpError(400, "VALIDATION_ERROR", "Datos de usuario invalidos.", result.error.flatten());
  }

  if (requirePassword && !result.data.password) {
    throw httpError(400, "VALIDATION_ERROR", "La contraseña es obligatoria.", {
      fieldErrors: { password: ["La contraseña es obligatoria."] },
    });
  }

  return {
    ...result.data,
    password: result.data.password || "",
    username: normalizeUsername(result.data.username),
    nombre: normalizeUpperText(result.data.nombre),
    apellido: normalizeUpperText(result.data.apellido),
    nombre_completo: normalizeUpperText(result.data.nombre_completo),
    email: normalizeEmail(result.data.email),
  };
}

function assertUniqueUsername(username, currentId) {
  const duplicate = getDb()
    .prepare(
      `SELECT id FROM usuarios
      WHERE LOWER(username) = LOWER(@username)
        AND (@current_id IS NULL OR id <> @current_id)
      LIMIT 1`
    )
    .get({ username, current_id: currentId || null });

  if (duplicate) {
    throw httpError(409, "DUPLICATE_USERNAME", "Ya existe un usuario con ese nombre.", {
      fieldErrors: { username: ["Ya existe un usuario con ese nombre."] },
    });
  }
}

function assertActiveRole(roleId) {
  const role = getDb().prepare("SELECT id FROM roles WHERE id = ? AND activo = 1").get(roleId);
  if (!role) {
    throw httpError(400, "ROLE_NOT_FOUND", "Rol invalido.");
  }
}

function assignRole(userId, roleId) {
  const db = getDb();
  db.prepare("DELETE FROM usuario_roles WHERE usuario_id = ?").run(userId);
  db.prepare("INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)").run(userId, roleId);
}

function countRows(db, tableName, whereClause) {
  const sql = whereClause
    ? `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${whereClause}`
    : `SELECT COUNT(*) AS total FROM ${tableName}`;
  return db.prepare(sql).get().total;
}

function buildReport(type) {
  const db = getDb();
  const reports = {
    clientes: {
      title: "Clientes",
      headers: ["id", "cliente", "dni_cuit", "telefono", "email", "localidad", "activo"],
      sql: `SELECT id,
        COALESCE(razon_social, TRIM(COALESCE(apellido, '') || ', ' || COALESCE(nombre, ''))) AS cliente,
        dni_cuit, telefono, email, localidad, activo
        FROM clientes
        ORDER BY cliente COLLATE NOCASE`,
    },
    expedientes: {
      title: "Expedientes",
      headers: ["id", "numero_expediente", "caratula", "cliente", "fuero", "estado_expediente", "fecha_inicio", "activo"],
      sql: `SELECT e.id, e.numero_expediente, e.caratula,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente,
        e.fuero, e.estado_expediente, e.fecha_inicio, e.activo
        FROM expedientes e
        LEFT JOIN clientes c ON c.id = e.cliente_principal_id
        ORDER BY e.updated_at DESC, e.id DESC`,
    },
    agenda: {
      title: "Agenda",
      headers: ["id", "expediente", "clase_actuacion", "titulo", "descripcion", "fecha_evento", "fecha_vencimiento", "estado_actuacion", "cumplida"],
      sql: `SELECT a.id,
        COALESCE(e.numero_expediente, e.caratula) AS expediente,
        a.clase_actuacion, a.titulo, a.descripcion, a.fecha_evento, a.fecha_vencimiento, a.estado_actuacion, a.cumplida
        FROM actuaciones a
        LEFT JOIN expedientes e ON e.id = a.expediente_id
        WHERE COALESCE(a.activo, 1) = 1
        ORDER BY COALESCE(a.fecha_vencimiento, a.fecha_evento, a.created_at) DESC`,
    },
    finanzas: {
      title: "Finanzas",
      headers: ["id", "fecha_movimiento", "concepto", "cliente", "expediente", "monto", "monto_cuota", "porcentaje_interes", "cuota_numero", "cuotas_total", "moneda", "estado_pago"],
      sql: `SELECT m.id, m.fecha_movimiento, m.concepto,
        COALESCE(c.razon_social, TRIM(COALESCE(c.apellido, '') || ', ' || COALESCE(c.nombre, ''))) AS cliente,
        COALESCE(e.numero_expediente, e.caratula) AS expediente,
        m.monto, m.monto_cuota, m.porcentaje_interes, COALESCE(m.cuota_numero, 1) AS cuota_numero, COALESCE(m.cuotas_total, 1) AS cuotas_total, m.moneda, m.estado_pago
        FROM movimientos_financieros m
        LEFT JOIN clientes c ON c.id = m.cliente_id
        LEFT JOIN expedientes e ON e.id = m.expediente_id
        WHERE COALESCE(m.activo, 1) = 1
        ORDER BY m.fecha_movimiento DESC, m.id DESC`,
    },
  };

  const report = reports[type];
  if (!report) {
    throw httpError(404, "REPORT_NOT_FOUND", "Reporte no encontrado.");
  }

  const rows = db.prepare(report.sql).all();
  return {
    ...report,
    generatedAt: new Date(),
    rows,
  };
}

function buildCsvReport(report) {
  return [
    report.headers.join(","),
    ...report.rows.map((row) => report.headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n");
}

function buildExcelReport(report) {
  const title = htmlEscape(report.title);
  const generatedAt = htmlEscape(formatDateTime(report.generatedAt));
  const headerCells = report.headers.map((header) => `<th>${htmlEscape(header)}</th>`).join("");
  const bodyRows = report.rows
    .map((row) => `<tr>${report.headers.map((header) => `<td>${htmlEscape(row[header])}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { font-size: 18px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #999; padding: 6px; font-size: 12px; }
    th { background: #dde3ec; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generado: ${generatedAt}</p>
  <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body>
</html>`;
}

function buildPdfReport(report) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const lineHeight = 13;
  const maxChars = 150;
  const lines = [
    report.title,
    `Generado: ${formatDateTime(report.generatedAt)}`,
    "",
    report.headers.join(" | "),
    "-".repeat(120),
    ...report.rows.map((row) => report.headers.map((header) => normalizePdfText(row[header])).join(" | ")),
  ].flatMap((line) => wrapPdfLine(line, maxChars));

  const pages = [];
  for (let index = 0; index < lines.length; index += 36) {
    pages.push(lines.slice(index, index + 36));
  }

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
    const content = buildPdfPageContent(pageLines, margin, pageHeight, lineHeight);
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

function buildPdfPageContent(lines, margin, pageHeight, lineHeight) {
  const commands = ["BT", "/F1 8 Tf", `${margin} ${pageHeight - margin} Td`];
  lines.forEach((line, index) => {
    if (index > 0) {
      commands.push(`0 -${lineHeight} Td`);
    }
    commands.push(`(${pdfEscape(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function htmlEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizePdfText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapPdfLine(line, maxChars) {
  const normalized = normalizePdfText(line);
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks = [];
  for (let index = 0; index < normalized.length; index += maxChars) {
    chunks.push(normalized.slice(index, index + maxChars));
  }
  return chunks;
}

function pdfEscape(value) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
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

function parseId(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw httpError(400, "INVALID_USER_ID", "Id de usuario invalido.");
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

function normalizeUpperText(value) {
  const text = normalizeText(value);
  return text ? text.toLocaleUpperCase("es-AR") : null;
}

function normalizeEmail(value) {
  const text = normalizeText(value);
  return text ? text.toLocaleLowerCase("es-AR") : null;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLocaleLowerCase("es-AR");
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
  buildBackupFilename,
  verifyBackupIntegrity,
};

module.exports = router;
