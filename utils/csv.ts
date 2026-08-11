import * as fs from 'fs';
import * as path from 'path';

/** Every CSV this suite produces lands here. */
export const CSV_OUTPUT_DIR = path.resolve(__dirname, '..', 'output', 'csv');

/**
 * Quote a cell only when it needs it. Company and role names can contain
 * commas, and an unescaped one silently shifts every later column.
 */
function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(',')
  );

  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Writes a CSV and returns its full path.
 *
 * The leading BOM is what makes Excel read the file as UTF-8; without it,
 * accented names in the Company column arrive mangled.
 */
export function writeCsv(
  fileName: string,
  headers: string[],
  rows: unknown[][]
): string {
  fs.mkdirSync(CSV_OUTPUT_DIR, { recursive: true });

  const filePath = path.join(CSV_OUTPUT_DIR, fileName);

  fs.writeFileSync(filePath, `﻿${toCsv(headers, rows)}`, 'utf8');

  return filePath;
}
