import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs
  .readFileSync(new URL("../src/utils/dateTime.js", import.meta.url), "utf8")
  .replace("export const BUSINESS_TIME_ZONE", "const BUSINESS_TIME_ZONE")
  .replaceAll("export function ", "function ")
  .concat(`
module.exports = {
  BUSINESS_TIME_ZONE,
  addDaysISO,
  currentMonthISO,
  formatDisplayDate,
  isPastISODate,
  isValidISODate,
  isValidYearMonth,
  lastDayOfMonthISO,
  todayISO,
};
`);

const sandbox = { module: { exports: {} }, exports: {}, Date, Intl, RangeError };
vm.runInNewContext(source, sandbox, { filename: "dateTime.js" });

const {
  BUSINESS_TIME_ZONE,
  addDaysISO,
  currentMonthISO,
  formatDisplayDate,
  isPastISODate,
  isValidISODate,
  isValidYearMonth,
  lastDayOfMonthISO,
  todayISO,
} = sandbox.module.exports;

test("dateTime frontend usa fecha local de Argentina para hoy y mes actual", () => {
  const instant = new Date("2026-05-01T02:30:00.000Z");

  assert.equal(BUSINESS_TIME_ZONE, "America/Argentina/Buenos_Aires");
  assert.equal(todayISO(instant), "2026-04-30");
  assert.equal(currentMonthISO(instant), "2026-04");
});

test("dateTime frontend valida fechas reales y meses reales", () => {
  assert.equal(isValidISODate("2026-04-28"), true);
  assert.equal(isValidISODate("2026-02-31"), false);
  assert.equal(isValidYearMonth("2026-12"), true);
  assert.equal(isValidYearMonth("2026-13"), false);
});

test("dateTime frontend calcula vencidos, fin de mes y suma de dias", () => {
  const instant = new Date("2026-04-28T15:00:00.000Z");

  assert.equal(isPastISODate("2026-04-27", instant), true);
  assert.equal(isPastISODate("2026-04-28", instant), false);
  assert.equal(lastDayOfMonthISO("2024-02"), "2024-02-29");
  assert.equal(addDaysISO("2026-04-30", 1), "2026-05-01");
  assert.throws(() => addDaysISO("2026-02-31", 1), /Fecha invalida/);
});

test("dateTime frontend formatea fecha visible sin corrimiento horario", () => {
  assert.equal(formatDisplayDate("2026-04-28"), "28/04/2026");
  assert.equal(formatDisplayDate("2026-02-31"), "");
});
