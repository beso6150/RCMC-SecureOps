const RIYADH_TZ = 'Asia/Riyadh';

const FORMULA_PREFIX = /^[=+\-@]/;

export function sanitizeCsvCell(value: unknown): string {
  if (value == null) return '';
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatRiyadhDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: RIYADH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export class CsvExportService {
  /** UTF-8 BOM + Arabic headers, formula-injection safe cells */
  buildCsv(headersAr: string[], rows: unknown[][]): string {
    const lines: string[] = [];
    lines.push(headersAr.map(sanitizeCsvCell).join(','));
    for (const row of rows) {
      lines.push(row.map(sanitizeCsvCell).join(','));
    }
    return `\uFEFF${lines.join('\r\n')}`;
  }

  buildFromObjects(
    columns: Array<{ key: string; headerAr: string }>,
    records: Record<string, unknown>[],
  ): string {
    const headers = columns.map((c) => c.headerAr);
    const rows = records.map((rec) =>
      columns.map((c) => {
        const v = rec[c.key];
        if (v instanceof Date) return formatRiyadhDate(v);
        return v;
      }),
    );
    return this.buildCsv(headers, rows);
  }
}

export const csvExportService = new CsvExportService();
