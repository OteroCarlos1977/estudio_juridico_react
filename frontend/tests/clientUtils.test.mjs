import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs
  .readFileSync(new URL("../src/modules/clients/clientUtils.js", import.meta.url), "utf8")
  .replace("export const emptyClientForm", "const emptyClientForm")
  .replaceAll("export function ", "function ")
  .concat(`
module.exports = {
  emptyClientForm,
  formatClientName,
  formatLocation,
  validateClientForm,
  normalizeClientField,
  normalizeClientPayload,
  clientToForm,
};
`);

const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(source, sandbox, { filename: "clientUtils.js" });

const {
  emptyClientForm,
  formatClientName,
  normalizeClientPayload,
  validateClientForm,
} = sandbox.module.exports;

test("valida datos minimos de cliente fisico y juridico", () => {
  assert.equal(
    validateClientForm({ ...emptyClientForm, tipo_persona: "fisica" }).apellido[0],
    "Debe cargar apellido o nombre para personas fisicas."
  );
  assert.equal(
    validateClientForm({ ...emptyClientForm, tipo_persona: "juridica" }).razon_social[0],
    "La razon social es obligatoria para personas juridicas."
  );
});

test("normaliza email, DNI/CUIT y textos principales", () => {
  const normalized = normalizeClientPayload({
    ...emptyClientForm,
    apellido: "perez",
    nombre: "juan",
    email: "  JUAN@TEST.COM ",
    dni_cuit: "20.123.456-7",
    telefono: "11 abc 4444",
  });

  assert.equal(normalized.apellido, "PEREZ");
  assert.equal(normalized.nombre, "JUAN");
  assert.equal(normalized.email, "juan@test.com");
  assert.equal(normalized.dni_cuit, "20123456-7");
  assert.equal(normalized.telefono, "11  4444");
});

test("formatea nombre visible de cliente", () => {
  assert.equal(formatClientName({ razon_social: "ACME SA", id: 1 }), "ACME SA");
  assert.equal(formatClientName({ apellido: "Perez", nombre: "Juan", id: 2 }), "Perez, Juan");
  assert.equal(formatClientName({ id: 3 }), "Cliente 3");
});
