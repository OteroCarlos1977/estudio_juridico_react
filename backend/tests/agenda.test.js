const assert = require("node:assert/strict");
const test = require("node:test");

const agendaRouter = require("../src/modules/agenda/agenda.routes");

const { isPastActionDate, parseActionPayload } = agendaRouter.__test;

function basePayload(overrides = {}) {
  return {
    expediente_id: 1,
    clase_actuacion: "tarea",
    titulo: "Presentar escrito",
    descripcion: "Presentar escrito",
    fecha_vencimiento: "2999-01-01",
    estado_actuacion: "pendiente",
    cumplida: false,
    dias_alerta: 3,
    ...overrides,
  };
}

test("parseActionPayload marca tareas vencidas si la fecha quedo atras", () => {
  const payload = parseActionPayload(basePayload({ fecha_vencimiento: "2000-01-01" }));

  assert.equal(payload.estado_actuacion, "vencida");
  assert.equal(payload.cumplida, 0);
});

test("parseActionPayload no marca como vencidas las tareas cumplidas", () => {
  const payload = parseActionPayload(
    basePayload({
      fecha_vencimiento: "2000-01-01",
      cumplida: true,
      estado_actuacion: "pendiente",
    })
  );

  assert.equal(payload.estado_actuacion, "finalizada");
  assert.equal(payload.cumplida, 1);
  assert.match(payload.fecha_cumplimiento, /^\d{4}-\d{2}-\d{2}$/);
});

test("parseActionPayload normaliza agenda con fecha de vencimiento como fecha de evento", () => {
  const payload = parseActionPayload(
    basePayload({
      clase_actuacion: "agenda",
      hora_evento: "09:30",
      fecha_evento: "",
      fecha_vencimiento: "2999-02-03",
    })
  );

  assert.equal(payload.fecha_evento, "2999-02-03");
  assert.equal(payload.hora_evento, "09:30");
});

test("isPastActionDate usa vencimiento o fecha de evento", () => {
  assert.equal(isPastActionDate({ fecha_vencimiento: "2000-01-01" }), true);
  assert.equal(isPastActionDate({ fecha_evento: "2999-01-01" }), false);
});
