/** Escapes a single CSV field per RFC 4180: quote it if it contains a comma, quote, or newline. */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
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
