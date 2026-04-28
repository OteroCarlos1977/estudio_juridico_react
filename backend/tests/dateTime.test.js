const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BUSINESS_TIME_ZONE,
  addDaysISO,
  currentMonthISO,
  currentTimestampSQL,
  formatDisplayDate,
  isPastISODate,
  isValidISODate,
  isValidYearMonth,
  lastDayOfMonthISO,
  todayISO,
} = require("../src/utils/dateTime");

test("todayISO usa la zona horaria funcional de Argentina y no UTC", () => {
  const instant = new Date("2026-04-28T02:30:00.000Z");

  assert.equal(todayISO(instant), "2026-04-27");
  assert.equal(todayISO(instant, "UTC"), "2026-04-28");
  assert.equal(BUSINESS_TIME_ZONE, "America/Argentina/Buenos_Aires");
});

test("currentMonthISO deriva el mes desde la fecha local de negocio", () => {
  const instant = new Date("2026-05-01T02:30:00.000Z");

  assert.equal(currentMonthISO(instant), "2026-04");
  assert.equal(currentMonthISO(instant, "UTC"), "2026-05");
});

test("currentTimestampSQL produce timestamp SQL local sin milisegundos", () => {
  const instant = new Date("2026-04-28T15:45:06.789Z");

  assert.equal(currentTimestampSQL(instant), "2026-04-28 12:45:06");
});

test("isValidISODate valida formato y rechaza fechas inexistentes", () => {
  assert.equal(isValidISODate("2026-04-28"), true);
  assert.equal(isValidISODate("2024-02-29"), true);
  assert.equal(isValidISODate("2026-02-29"), false);
  assert.equal(isValidISODate("2026-02-31"), false);
  assert.equal(isValidISODate("28/04/2026"), false);
});

test("isValidYearMonth valida meses reales", () => {
  assert.equal(isValidYearMonth("2026-01"), true);
  assert.equal(isValidYearMonth("2026-12"), true);
  assert.equal(isValidYearMonth("2026-00"), false);
  assert.equal(isValidYearMonth("2026-13"), false);
});

test("isPastISODate compara contra el hoy local", () => {
  const instant = new Date("2026-04-28T02:30:00.000Z");

  assert.equal(isPastISODate("2026-04-26", instant), true);
  assert.equal(isPastISODate("2026-04-27", instant), false);
  assert.equal(isPastISODate("2026-04-28", instant), false);
  assert.equal(isPastISODate("2026-02-31", instant), false);
});

test("lastDayOfMonthISO contempla meses normales y bisiestos", () => {
  assert.equal(lastDayOfMonthISO("2026-04"), "2026-04-30");
  assert.equal(lastDayOfMonthISO("2024-02"), "2024-02-29");
  assert.equal(lastDayOfMonthISO("2026-02"), "2026-02-28");
  assert.throws(() => lastDayOfMonthISO("2026-13"), /Mes invalido/);
});

test("addDaysISO suma dias de calendario sobre strings ISO", () => {
  assert.equal(addDaysISO("2026-04-28", 1), "2026-04-29");
  assert.equal(addDaysISO("2026-04-30", 1), "2026-05-01");
  assert.equal(addDaysISO("2024-02-28", 1), "2024-02-29");
  assert.equal(addDaysISO("2026-01-01", -1), "2025-12-31");
  assert.throws(() => addDaysISO("2026-02-31", 1), /Fecha invalida/);
});

test("formatDisplayDate formatea solo fechas ISO validas", () => {
  assert.equal(formatDisplayDate("2026-04-28"), "28/04/2026");
  assert.equal(formatDisplayDate("2026-02-31"), "");
});
