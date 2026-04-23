const { getDb } = require("./db/database");

const tableByPath = [
  ["/api/clientes", "clientes"],
  ["/api/expedientes", "expedientes"],
  ["/api/agenda", "actuaciones"],
  ["/api/finanzas", "movimientos_financieros"],
  ["/api/adjuntos", "adjuntos"],
  ["/api/sistema/usuarios", "usuarios"],
  ["/api/sistema/backups", "backups"],
];

function auditCrud(req, res, next) {
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!mutating || req.path === "/api/auth/login") {
    return next();
  }

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      return;
    }

    const table = tableByPath.find(([prefix]) => req.originalUrl.startsWith(prefix))?.[1];
    if (!table) {
      return;
    }

    try {
      getDb()
        .prepare(
          `INSERT INTO auditoria (usuario_id, tabla_afectada, registro_id, accion, descripcion, fecha_hora, datos_previos, datos_nuevos)
          VALUES (@usuario_id, @tabla_afectada, @registro_id, @accion, @descripcion, CURRENT_TIMESTAMP, NULL, NULL)`
        )
        .run({
          usuario_id: req.user?.id || null,
          tabla_afectada: table,
          registro_id: req.params?.id ? String(req.params.id) : null,
          accion: methodToAction(req.method),
          descripcion: `${req.method} ${req.originalUrl}`,
        });
    } catch (err) {
      console.error("Audit insert failed", err);
    }
  });

  next();
}

function methodToAction(method) {
  if (method === "POST") return "crear";
  if (method === "PUT" || method === "PATCH") return "actualizar";
  if (method === "DELETE") return "eliminar";
  return method.toLowerCase();
}

module.exports = {
  auditCrud,
};
