const assert = require("node:assert/strict");
const test = require("node:test");

const financeRouter = require("../src/modules/finance/finance.routes");

const { buildFinanceReportModel, buildPaymentPlanRows, formatPlanConcept } = financeRouter.__test;

test("reporte por cobrar separa deuda no vencida y cobros vencidos", () => {
  const rows = [
    {
      concepto: "Cuota futura",
      estado_pago: "Pendiente",
      fecha_movimiento: "2026-04-01",
      fecha_vencimiento: "2999-04-30",
      tipo_movimiento_slug: "cuenta_por_cobrar",
      moneda: "ARS",
      monto: 100,
    },
    {
      concepto: "Cuota vencida",
      estado_pago: "Vencido",
      fecha_movimiento: "2026-04-01",
      fecha_vencimiento: "2026-04-10",
      tipo_movimiento_slug: "cuenta_por_cobrar",
      moneda: "ARS",
      monto: 200,
    },
    {
      concepto: "Cobro efectivo",
      estado_pago: "Cobrado",
      fecha_movimiento: "2026-04-01",
      tipo_movimiento_slug: "ingreso",
      moneda: "ARS",
      monto: 300,
    },
  ];

  const report = buildFinanceReportModel(rows, {
    tipo_reporte: "receivable",
    desde: "2026-04-01",
    hasta: "2026-04-30",
  });

  assert.equal(report.sections.length, 2);
  assert.equal(report.sections[0].key, "receivable");
  assert.equal(report.sections[0].rows.length, 1);
  assert.equal(report.sections[0].totals.ARS, 100);
  assert.equal(report.sections[1].key, "overdue");
  assert.equal(report.sections[1].rows.length, 1);
  assert.equal(report.sections[1].totals.ARS, 200);
});

test("reporte general calcula balance ingresos menos pagos", () => {
  const report = buildFinanceReportModel(
    [
      { estado_pago: "Cobrado", tipo_movimiento_slug: "ingreso", moneda: "ARS", monto: 500 },
      { estado_pago: "Pagado", tipo_movimiento_slug: "gasto", moneda: "ARS", monto: 125 },
    ],
    { tipo_reporte: "general", desde: "2026-04-01", hasta: "2026-04-30" }
  );

  assert.equal(report.balance.ARS, 375);
});

test("planes de pago generan seguimiento por cuota", () => {
  const rows = buildPaymentPlanRows([
    {
      concepto: "Convenio honorarios - cuota 4/6",
      estado_pago: "Pendiente",
      fecha_movimiento: "2026-04-01",
      fecha_vencimiento: "2999-04-10",
      monto: 180000,
      monto_cuota: 30000,
      cuota_numero: 4,
      cuotas_total: 6,
      moneda: "ARS",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].progreso_plan, "4/6");
  assert.equal(rows[0].seguimiento_estado, "Pendiente");
  assert.equal(rows[0].monto_pendiente, 30000);
  assert.equal(formatPlanConcept("Convenio honorarios - cuota 4/6"), "Convenio honorarios");
});
