function buildExcelReport(report) {
  const title = htmlEscape(report.title);
  const generatedAt = htmlEscape(formatDateTime(report.generatedAt || new Date()));
  const headerCells = report.headers.map((header) => `<th>${htmlEscape(header)}</th>`).join("");
  const bodyRows = report.rows
    .map((row) => `<tr>${report.headers.map((header) => `<td>${htmlEscape(row[header])}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { font-size: 18px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #999; padding: 6px; font-size: 12px; }
    th { background: #dde3ec; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generado: ${generatedAt}</p>
  <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body>
</html>`;
}

function buildPdfReport(report) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const lineHeight = 13;
  const maxChars = 150;
  const lines = [
    report.title,
    `Generado: ${formatDateTime(report.generatedAt || new Date())}`,
    "",
    report.headers.join(" | "),
    "-".repeat(120),
    ...report.rows.map((row) => report.headers.map((header) => normalizePdfText(row[header])).join(" | ")),
  ].flatMap((line) => wrapPdfLine(line, maxChars));

  const pages = [];
  for (let index = 0; index < lines.length; index += 36) {
    pages.push(lines.slice(index, index + 36));
  }

  const objects = [];
  const pageObjectNumbers = [];
  const fontObjectNumber = 3;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = null;
  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 4 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    const content = buildPdfPageContent(pageLines, margin, pageHeight, lineHeight);
    objects[pageObjectNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function buildPdfPageContent(lines, margin, pageHeight, lineHeight) {
  const commands = ["BT", "/F1 8 Tf", `${margin} ${pageHeight - margin} Td`];
  lines.forEach((line, index) => {
    if (index > 0) commands.push(`0 -${lineHeight} Td`);
    commands.push(`(${pdfEscape(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function htmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizePdfText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapPdfLine(line, maxChars) {
  const normalized = normalizePdfText(line);
  if (normalized.length <= maxChars) return [normalized];
  const chunks = [];
  for (let index = 0; index < normalized.length; index += maxChars) {
    chunks.push(normalized.slice(index, index + maxChars));
  }
  return chunks;
}

function pdfEscape(value) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatDateTime(value) {
  return value.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

module.exports = {
  buildExcelReport,
  buildPdfReport,
};
