const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db/database");

const jwtSecret = process.env.JWT_SECRET || "dev-only-change-this-secret";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "8h";

function hashLegacyPassword(password, salt) {
  return crypto.pbkdf2Sync(password.trim(), salt, 120000, 32, "sha256").toString("hex");
}

async function buildPasswordFields(password) {
  const passwordHash = await bcrypt.hash(password, 12);
  return { password_hash: passwordHash, password_salt: "bcrypt" };
}

async function verifyPassword(user, password) {
  if (!user?.password_hash) {
    return false;
  }

  if (user.password_salt === "bcrypt" || user.password_hash.startsWith("$2")) {
    return bcrypt.compare(password, user.password_hash);
  }

  if (!user.password_salt) {
    return false;
  }

  const matches = hashLegacyPassword(password, user.password_salt) === user.password_hash;
  if (matches) {
    const fields = await buildPasswordFields(password);
    getDb()
      .prepare("UPDATE usuarios SET password_hash = @password_hash, password_salt = @password_salt, updated_at = CURRENT_TIMESTAMP WHERE id = @id")
      .run({ id: user.id, ...fields });
  }
  return matches;
}

function getUserByUsername(username) {
  return getDb()
    .prepare(
      `SELECT *
      FROM usuarios
      WHERE username = ? AND activo = 1`
    )
    .get(username.trim());
}

function getUserById(id) {
  return getDb()
    .prepare(
      `SELECT
        u.id,
        u.username,
        COALESCE(u.nombre_completo, TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellido, ''))) AS nombre_completo,
        u.email,
        u.activo,
        u.es_sistema
      FROM usuarios u
      WHERE u.id = ? AND u.activo = 1`
    )
    .get(id);
}

function getUserRoles(userId) {
  return getDb()
    .prepare(
      `SELECT r.nombre
      FROM usuario_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ? AND r.activo = 1
      ORDER BY r.nombre`
    )
    .all(userId)
    .map((row) => row.nombre);
}

function getPermissions(roles) {
  const permissions = new Set();
  for (const role of roles) {
    if (role === "Administrador") {
      ["read", "write", "delete", "admin"].forEach((permission) => permissions.add(permission));
    } else if (role === "Operador") {
      ["read", "write"].forEach((permission) => permissions.add(permission));
    } else {
      permissions.add("read");
    }
  }
  return [...permissions].sort();
}

function buildPublicUser(user) {
  const roles = getUserRoles(user.id);
  return {
    id: user.id,
    username: user.username,
    nombre_completo: user.nombre_completo || user.username,
    email: user.email,
    roles,
    permissions: getPermissions(roles),
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = {
  buildPasswordFields,
  buildPublicUser,
  getPermissions,
  getUserById,
  getUserByUsername,
  getUserRoles,
  signToken,
  verifyPassword,
  verifyToken,
};
