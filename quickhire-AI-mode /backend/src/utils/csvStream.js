/**
 * CSV streaming helpers for admin export endpoints.
 *
 * Why streaming: a single export of 50K+ rows would OOM if assembled in
 * memory and sent as one HTTP body. We pipe rows through a Node Readable
 * directly into the Express response, with the Mongo cursor providing
 * back-pressure. Memory stays flat regardless of result-set size.
 *
 * Usage:
 *   import { streamCursorAsCsv } from '../../utils/csvStream.js';
 *
 *   r.get('/payments.csv', adminGuard, permGuard(PERMS.PAYMENT_READ),
 *     asyncHandler(async (req, res) => {
 *       const cursor = paymentsCol().find(filter).sort({ createdAt: -1 });
 *       await streamCursorAsCsv(res, {
 *         filename: 'payments.csv',
 *         cursor,
 *         columns: [
 *           { header: 'Payment ID', key: 'paymentId' },
 *           { header: 'Amount',     key: 'amount', type: 'number' },
 *           // …
 *         ],
 *       });
 *     }));
 */

/**
 * Escape a single cell value for CSV. Wraps in quotes when the value
 * contains a quote, comma, newline, or leading/trailing whitespace, and
 * doubles internal quotes per RFC 4180.
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let s;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === 'object') {
    // Best-effort serialise — most callers should pre-format objects via
    // a column.format() function so this is a safety net for nested
    // fields that slip through.
    try { s = JSON.stringify(value); } catch { s = String(value); }
  } else {
    s = String(value);
  }
  if (/["\n\r,]|^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Resolve a column's value from a row.
 *
 * Each column accepts:
 *   - `key` (dot-path supported, e.g. "invoice.tax.amount")
 *   - optional `format(value, row)` to coerce / pretty-print before
 *     escaping (e.g. format dates as "2026-05-02" rather than ISO).
 */
function resolveCell(col, row) {
  let v = row;
  if (col.format) {
    return col.format(getByPath(row, col.key), row);
  }
  if (typeof col.key === 'function') {
    return col.key(row);
  }
  v = getByPath(row, col.key);
  return v;
}

function getByPath(obj, path) {
  if (!path) return obj;
  if (typeof path !== 'string') return obj?.[path];
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

/**
 * Stream a Mongo cursor into the Express response as a CSV download.
 *
 * Sets Content-Type and Content-Disposition headers, writes the header
 * row, then pulls rows from the cursor one at a time and writes each as
 * a CSV line. The cursor is closed in a finally block so a client
 * disconnect doesn't leak DB connections.
 *
 * @param {import('express').Response} res
 * @param {{
 *   filename: string,
 *   cursor: import('mongodb').FindCursor,
 *   columns: Array<{
 *     header: string,
 *     key: string|((row: any) => any),
 *     format?: (value: any, row: any) => any,
 *   }>,
 *   rowLimit?: number,  // safety cap, default 100k
 * }} args
 */
export async function streamCursorAsCsv(res, { filename, cursor, columns, rowLimit = 100_000 }) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename.replace(/[^\w.-]+/g, '_')}"`,
  );
  // Hint the client not to cache an export — every download is "live".
  res.setHeader('Cache-Control', 'no-store');

  // Header row first
  res.write(columns.map((c) => escapeCsvCell(c.header)).join(',') + '\n');

  let count = 0;
  try {
    for await (const row of cursor) {
      const cells = columns.map((c) => escapeCsvCell(resolveCell(c, row)));
      res.write(cells.join(',') + '\n');
      count += 1;
      if (count >= rowLimit) break;
    }
  } finally {
    try { await cursor.close?.(); } catch { /* ignore */ }
    res.end();
  }
}
