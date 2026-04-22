const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { getDatabaseInfo } = require("./db/database");

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: frontendOrigin }));
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
    clients: 0,
    cases: 0,
    pendingDeadlines: 0,
    unpaidMovements: 0,
  });
});

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
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Using data directory: ${path.resolve(__dirname, "../../..", "data")}`);
});
