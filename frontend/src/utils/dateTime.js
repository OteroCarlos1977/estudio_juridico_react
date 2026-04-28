export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function todayISO(now = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  return formatDateParts(now, timeZone);
}

export function currentMonthISO(now = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  return todayISO(now, timeZone).slice(0, 7);
}

export function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidYearMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const month = Number(String(value).slice(5, 7));
  return month >= 1 && month <= 12;
}

export function isPastISODate(value, now = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  return isValidISODate(value) && value < todayISO(now, timeZone);
}

export function lastDayOfMonthISO(yearMonth) {
  if (!isValidYearMonth(yearMonth)) {
    throw new RangeError("Mes invalido. Use formato YYYY-MM.");
  }

  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
}

export function addDaysISO(value, days) {
  if (!isValidISODate(value)) {
    throw new RangeError("Fecha invalida. Use formato YYYY-MM-DD.");
  }

  const amount = Number(days);
  if (!Number.isInteger(amount)) {
    throw new RangeError("La cantidad de dias debe ser entera.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(value, locale = "es-AR") {
  if (!isValidISODate(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getDateTimeParts(value, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]));
}

function formatDateParts(value, timeZone) {
  const parts = getDateTimeParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
