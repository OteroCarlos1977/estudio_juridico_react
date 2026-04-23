const { buildPublicUser, getUserById, verifyToken } = require("./auth.service");

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Sesion requerida." });
    }

    const payload = verifyToken(token);
    const user = getUserById(Number(payload.sub));
    if (!user) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Usuario invalido o inactivo." });
    }

    req.user = buildPublicUser(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Sesion invalida o vencida." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    if (!roles.some((role) => userRoles.includes(role))) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Permisos insuficientes." });
    }
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Permisos insuficientes." });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
};
