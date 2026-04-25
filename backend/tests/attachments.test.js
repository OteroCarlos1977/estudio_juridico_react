const assert = require("node:assert/strict");
const test = require("node:test");

const attachmentsRouter = require("../src/modules/attachments/attachments.routes");

const {
  assertHasAssociation,
  buildListWhere,
  isIsoDate,
  normalizePayload,
  parseAttachmentPayload,
  parseId,
  parseListFilters,
} = attachmentsRouter.__test;

test("parseAttachmentPayload normaliza strings vacios, trims y numeros coercionados", () => {
  const payload = parseAttachmentPayload({
    expediente_id: "12",
    cliente_id: "",
    actuacion_id: null,
    movimiento_financiero_id: undefined,
    descripcion: "  Demanda inicial  ",
    fecha_documento: " 2026-04-25 ",
  });

  assert.deepEqual(payload, {
    expediente_id: 12,
    cliente_id: null,
    actuacion_id: null,
    movimiento_financiero_id: null,
    descripcion: "Demanda inicial",
    fecha_documento: "2026-04-25",
  });
});

test("parseAttachmentPayload rechaza fecha_documento fuera de formato ISO", () => {
  assert.throws(
    () => parseAttachmentPayload({ cliente_id: 1, fecha_documento: "25/04/2026" }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.ok(error.details.fieldErrors.fecha_documento.length > 0);
      return true;
    }
  );
});

test("assertHasAssociation exige al menos una entidad asociada", () => {
  assert.throws(
    () =>
      assertHasAssociation({
        expediente_id: null,
        cliente_id: null,
        actuacion_id: null,
        movimiento_financiero_id: null,
      }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.code, "ASSOCIATION_REQUIRED");
      return true;
    }
  );

  assert.doesNotThrow(() => assertHasAssociation({ cliente_id: 3 }));
});

test("parseListFilters valida ids y limita paginacion de adjuntos", () => {
  assert.deepEqual(parseListFilters({ expediente_id: "5", cliente_id: "8", limit: "75" }), {
    expediente_id: 5,
    cliente_id: 8,
    limit: 75,
  });

  assert.equal(parseListFilters({ limit: "999" }).limit, 120);
  assert.equal(parseListFilters({ limit: "-1" }).limit, 120);
  assert.throws(() => parseListFilters({ expediente_id: "abc" }), /Id invalido/);
});

test("buildListWhere arma filtros activos por expediente y cliente", () => {
  const { whereSql, params } = buildListWhere({ expediente_id: 7, cliente_id: 9, limit: 50 });

  assert.match(whereSql, /COALESCE\(a\.activo, 1\) = 1/);
  assert.match(whereSql, /a\.expediente_id = @expediente_id/);
  assert.match(whereSql, /ac\.expediente_id = @expediente_id/);
  assert.match(whereSql, /a\.cliente_id = @cliente_id/);
  assert.deepEqual(params, { expediente_id: 7, cliente_id: 9, limit: 50 });
});

test("helpers de adjuntos validan ids, fechas y normalizacion directa", () => {
  assert.equal(parseId("11", "INVALID_ID"), 11);
  assert.throws(() => parseId("0", "INVALID_ID"), /Id invalido/);
  assert.equal(isIsoDate("2026-04-25"), true);
  assert.equal(isIsoDate("2026-02-31"), false);
  assert.equal(isIsoDate("25-04-2026"), false);
  assert.deepEqual(
    normalizePayload({
      expediente_id: 1,
      cliente_id: 0,
      actuacion_id: undefined,
      movimiento_financiero_id: "",
      descripcion: "  ",
      fecha_documento: " 2026-01-02 ",
    }),
    {
      expediente_id: 1,
      cliente_id: null,
      actuacion_id: null,
      movimiento_financiero_id: null,
      descripcion: null,
      fecha_documento: "2026-01-02",
    }
  );
});
