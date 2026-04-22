const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { getDatabaseInfo, getDb } = require("./db/database");

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "estudio-juridico-api",
    environment: process.env.NODE_ENV || "development",
    database: getDatabaseInfo(),
  });
});

app.get("/api/dashboard/summary", (req, res) => {
  res.json({
    clients: countRows("clientes", "activo = 1"),
    cases: countRows("expedientes", "activo = 1"),
    pendingDeadlines: countRows(
      "actuaciones",
      "cumplida = 0 AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento <> ''"
    ),
    unpaidMovements: countRows(
      "movimientos_financieros",
      "LOWER(COALESCE(estado_pago, '')) NOT IN ('pagado', 'cancelado', 'cobrado')"
    ),
  });
});

app.get("/api/clientes", (req, res) => {
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

function countRows(tableName, whereClause) {
  const db = getDb();
  const tableExists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  if (!tableExists) {
    return 0;
  }

  const sql = whereClause
    ? `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${whereClause}`
    : `SELECT COUNT(*) AS total FROM ${tableName}`;

  return db.prepare(sql).get().total;
}

app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `No route for ${req.method} ${req.path}`,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error",
  });
});

app.listen(port, () => {
  const database = getDatabaseInfo();

  console.log(`API listening on http://localhost:${port}`);
  console.log(`Using database: ${database.path}`);
});
