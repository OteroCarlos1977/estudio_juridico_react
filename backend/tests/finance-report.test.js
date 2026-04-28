const assert = require("node:assert/strict");
const test = require("node:test");

const financeRouter = require("../src/modules/finance/finance.routes");

const {
  applySettlementDate,
  buildFinanceReportModel,
  buildPaymentPlanRows,
  currentMonth,
  formatPlanConcept,
  isPastDate,
  parseFinanceReportFilters,
} = financeRouter.__test;

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

test("parseFinanceReportFilters calcula fin de mes sin Date.parse flexible", () => {
  const leap = parseFinanceReportFilters({ mes: "2024-02", tipo_reporte: "general" });
  const normal = parseFinanceReportFilters({ mes: "2026-02", tipo_reporte: "general" });

  assert.equal(leap.desde, "2024-02-01");
  assert.equal(leap.hasta, "2024-02-29");
  assert.equal(normal.hasta, "2026-02-28");
});

test("helpers de fechas de finanzas usan calendario local y fechas validas", () => {
  assert.match(currentMonth(), /^\d{4}-\d{2}$/);
  assert.equal(isPastDate("2000-01-01"), true);
  assert.equal(isPastDate("2999-01-01"), false);
  assert.equal(isPastDate("2026-02-31"), false);
});

test("applySettlementDate actualiza fecha al pasar de pendiente a cobrado", () => {
  const payload = { estado_pago: "Cobrado", fecha_movimiento: "2026-01-01" };

  applySettlementDate({ estado_pago: "Vencido" }, payload);

  assert.match(payload.fecha_movimiento, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(payload.fecha_movimiento, "2026-01-01");
});
