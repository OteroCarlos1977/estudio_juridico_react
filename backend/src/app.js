const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { getDatabaseInfo, getDb } = require("./db/database");
const { auditCrud } = require("./audit");
const { requireAuth, requirePermission } = require("./auth/auth.middleware");
const authRouter = require("./auth/auth.routes");
const clientsRouter = require("./modules/clients/clients.routes");
const casesRouter = require("./modules/cases/cases.routes");
const agendaRouter = require("./modules/agenda/agenda.routes");
const financeRouter = require("./modules/finance/finance.routes");
const attachmentsRouter = require("./modules/attachments/attachments.routes");
const systemRouter = require("./modules/system/system.routes");

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

app.get("/api/dashboard/summary", requireAuth, requirePermission("read"), (req, res) => {
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

app.get("/api/dashboard/dollar", requireAuth, requirePermission("read"), async (req, res, next) => {
  try {
    const response = await fetch("https://dolarapi.com/v1/dolares");
    if (!response.ok) {
      throw httpError(502, "DOLLAR_API_ERROR", "No se pudo consultar la cotizacion del dolar.");
    }

    const quotes = await response.json();
    const relevantQuotes = quotes
      .filter((quote) => ["oficial", "blue", "tarjeta"].includes(quote.casa))
      .map((quote) => ({
        casa: quote.casa,
        nombre: quote.nombre,
        compra: quote.compra,
        venta: quote.venta,
        moneda: quote.moneda,
        fechaActualizacion: quote.fechaActualizacion,
      }));

    res.json({ quotes: relevantQuotes });
  } catch (err) {
    next(err.status ? err : httpError(502, "DOLLAR_API_ERROR", "No se pudo consultar la cotizacion del dolar."));
  }
});

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api", auditCrud);
app.use("/api", requirePermission("read"));
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    return requirePermission("write")(req, res, next);
  }

  if (req.method === "DELETE") {
    return requirePermission("delete")(req, res, next);
  }

  next();
});

app.use("/api/clientes", clientsRouter);
app.use("/api/expedientes", casesRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/finanzas", financeRouter);
app.use("/api/adjuntos", attachmentsRouter);
app.use("/api/sistema", systemRouter);

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

function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `No route for ${req.method} ${req.path}`,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;

  res.status(status).json({
    error: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "Unexpected server error",
    details: err.details,
  });
});

app.listen(port, () => {
  const database = getDatabaseInfo();

  console.log(`API listening on http://localhost:${port}`);
  console.log(`Using database: ${database.path}`);
});
