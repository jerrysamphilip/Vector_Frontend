// Building CSV files in the browser. Every cell goes through csvCell so a value can neither break the
// row (quotes, commas, newlines) nor run as a spreadsheet formula when the file is opened in Excel /
// Sheets (CSV / formula injection: a cell starting with = + - @ or a tab / carriage return).

const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV cell: always quoted, quotes doubled, formula-like values prefixed with a single quote. */
export function csvCell(value) {
    let text = value === null || value === undefined ? '' : String(value);
    if (FORMULA_START.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

/** Rows (arrays of values) to CSV text, CRLF line endings as RFC 4180. */
export function toCsv(rows) {
    return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

/** Save rows as a .csv download. A BOM keeps non-ASCII names readable when Excel opens the file. */
export function downloadCsv(filename, rows) {
    const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
