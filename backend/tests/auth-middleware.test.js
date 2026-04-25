const assert = require("node:assert/strict");
const test = require("node:test");

const { requirePermission, requireRole } = require("../src/auth/auth.middleware");

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("requireRole permite usuarios con rol requerido", () => {
  const req = { user: { roles: ["Administrador"] } };
  const res = createResponse();
  let called = false;

  requireRole("Administrador")(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.statusCode, null);
});

test("requireRole rechaza usuarios sin rol requerido", () => {
  const req = { user: { roles: ["Operador"] } };
  const res = createResponse();
  let called = false;

  requireRole("Administrador")(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "FORBIDDEN");
});

test("requirePermission permite permisos presentes", () => {
  const req = { user: { permissions: ["read", "write"] } };
  const res = createResponse();
  let called = false;

  requirePermission("write")(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.statusCode, null);
});

test("requirePermission rechaza permisos ausentes", () => {
  const req = { user: { permissions: ["read"] } };
  const res = createResponse();
  let called = false;

  requirePermission("delete")(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "FORBIDDEN");
});
