import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs
  .readFileSync(new URL("../src/modules/finance/financeUtils.js", import.meta.url), "utf8")
  .replace('import { currentMonthISO, isPastISODate } from "../../utils/dateTime";', `
function currentMonthISO() {
  return new Date().toISOString().slice(0, 7);
}
function isPastISODate(value) {
  if (!value || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value))) return false;
  return value < new Date().toISOString().slice(0, 10);
}
`)
  .replaceAll("export function ", "function ")
  .concat(`
module.exports = {
  buildGeneralMovements,
  buildSummaries,
  classifyMovementGroup,
  formatConcept,
  formatInstallments,
  formatMoney,
  getCurrentInstallmentAmount,
  groupMovements,
};
`);

const sandbox = { module: { exports: {} }, exports: {}, Date };
vm.runInNewContext(source, sandbox, { filename: "financeUtils.js" });

const {
  buildGeneralMovements,
  buildSummaries,
  classifyMovementGroup,
  formatConcept,
  formatInstallments,
  formatMoney,
  getCurrentInstallmentAmount,
  groupMovements,
} = sandbox.module.exports;

const currentMonth = new Date().toISOString().slice(0, 7);
const previousMonth = Number(currentMonth.slice(5)) === 1
  ? `${Number(currentMonth.slice(0, 4)) - 1}-12`
  : `${currentMonth.slice(0, 4)}-${String(Number(currentMonth.slice(5)) - 1).padStart(2, "0")}`;

test("groupMovements clasifica pagos, cobros, por cobrar y vencidos", () => {
  const movements = [
    { id: 1, tipo_movimiento_slug: "gasto", estado_pago: "Pagado", fecha_movimiento: `${currentMonth}-01`, monto: 100 },
    { id: 2, tipo_movimiento_slug: "ingreso", estado_pago: "Cobrado", fecha_movimiento: `${currentMonth}-02`, monto: 200 },
    { id: 3, tipo_movimiento_slug: "cuenta_por_cobrar", estado_pago: "Pendiente", fecha_vencimiento: "2999-01-01", monto: 300 },
    { id: 4, tipo_movimiento_slug: "cuenta_por_cobrar", estado_pago: "Pendiente", fecha_vencimiento: "2000-01-01", monto: 400 },
    { id: 5, tipo_movimiento_slug: "ingreso", estado_pago: "Cobrado", fecha_movimiento: `${previousMonth}-02`, monto: 500 },
  ];

  const groups = groupMovements(movements, false);

  assert.equal(JSON.stringify(groups.payable.map((item) => item.id)), JSON.stringify([1]));
  assert.equal(JSON.stringify(groups.collected.map((item) => item.id)), JSON.stringify([2]));
  assert.equal(JSON.stringify(groups.pending.map((item) => item.id)), JSON.stringify([3]));
  assert.equal(JSON.stringify(groups.overdue.map((item) => item.id)), JSON.stringify([4]));
});

test("buildSummaries calcula saldo del mes desde cobrado menos pagos", () => {
  const summaries = buildSummaries({
    payable: [{ monto: 50, moneda: "ARS" }],
    collected: [{ monto: 210, moneda: "ARS" }],
    pending: [{ monto: 100, cuotas_total: 4, monto_cuota: 25, moneda: "ARS" }],
    overdue: [],
  });
  const balance = summaries.find((item) => item.key === "monthly-balance");
  const pending = summaries.find((item) => item.key === "pending");

  assert.equal(balance.amount, 160);
  assert.equal(balance.caption, "Cobrado - pagos");
  assert.equal(pending.amount, 25);
});

test("buildGeneralMovements conserva una vista general con etiquetas por grupo", () => {
  const rows = buildGeneralMovements({
    payable: [{ id: 1 }],
    collected: [{ id: 2 }],
    pending: [{ id: 3 }],
    overdue: [{ id: 4 }],
  });

  assert.equal(JSON.stringify(rows.map((item) => item.financeGroupLabel)), JSON.stringify(["Lo que se paga", "Cobrado", "Por cobrar", "Cobros vencidos"]));
  assert.equal(JSON.stringify(rows.map((item) => item.financeSortKey)), JSON.stringify(["payable", "collected", "pending", "overdue"]));
});

test("helpers de finanzas formatean cuotas, conceptos y clasificacion base", () => {
  assert.equal(formatMoney(1234.5, "ARS"), "ARS 1.234,50");
  assert.equal(formatInstallments({ cuota_numero: 4, cuotas_total: 6, monto_cuota: 30000, moneda: "ARS" }), "4/6 · ARS 30.000,00");
  assert.equal(
    formatInstallments({ cuota_numero: 4, cuotas_total: 6, monto_cuota: 30000, moneda: "ARS", estado_pago: "Cobrado" }),
    "4/6 · ARS 30.000,00 · cobrada"
  );
  assert.equal(formatConcept({ concepto: "Honorarios - EXP-001", numero_expediente: "EXP-001" }), "Honorarios");
  assert.equal(getCurrentInstallmentAmount({ monto: 120000, cuotas_total: 4, monto_cuota: 30000 }), 30000);
  assert.equal(classifyMovementGroup({ tipo_movimiento_slug: "cuenta_por_pagar", estado_pago: "Pendiente" }), "payments");
  assert.equal(classifyMovementGroup({ tipo_movimiento_slug: "ingreso", estado_pago: "Cobrado" }), "income");
  assert.equal(classifyMovementGroup({ tipo_movimiento_slug: "cuenta_por_cobrar", estado_pago: "Pendiente" }), "receivable");
});
