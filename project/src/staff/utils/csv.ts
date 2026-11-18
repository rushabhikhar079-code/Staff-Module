export type CsvRow = Record<string, string>;

export interface CsvColumn<T> {
  key: string;
  label: string;
  value: (row: T) => string | number | undefined | null;
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const source = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((cells) => cells.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map(normalizeHeader);
  const rows = nonEmpty.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      if (header) row[header] = (cells[index] ?? '').trim();
    });
    return row;
  });
  return { headers: headers.filter(Boolean), rows };
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function escapeCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(String(column.value(row) ?? ''))).join(','),
  );
  return [header, ...body].join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
