import type { ImportRow } from "./practice.types";

/** Small RFC-style CSV parser: quoted fields, escaped quotes and CRLF/newlines. */
export function parseImport(text: string): ImportRow[] {
  const input = text.replace(/^\uFEFF/, "").trim();
  if (input.length > 1024 * 1024) throw new Error("Import text must be no larger than 1 MB.");
  if (!input) throw new Error("Choose a file or paste CSV/JSON first.");
  if (input.startsWith("[")) {
    const value: unknown = JSON.parse(input);
    if (!Array.isArray(value) || value.length === 0 || value.length > 500) throw new Error("Import 1–500 rows.");
    return value.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row) || Object.values(row).some(v => typeof v !== "string")) throw new Error("JSON rows must be objects containing text values.");
      return row as ImportRow;
    });
  }
  const records: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closedQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted) { quoted = false; closedQuote = true; }
      else if (!cell && !closedQuote) quoted = true;
      else throw new Error("A quote must start at the beginning of a CSV field.");
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell); cell = ""; closedQuote = false;
      if (c !== ",") { if (row.some(Boolean)) records.push(row); row = []; if (c === "\r" && input[i + 1] === "\n") i++; }
    } else {
      if (closedQuote) throw new Error("A closing CSV quote must be followed by a comma or line break.");
      cell += c;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  row.push(cell); if (row.some(Boolean)) records.push(row);
  const headers = records.shift()?.map(h => h.trim()) ?? [];
  if (headers.length < 2 || headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error("CSV needs distinct, nonempty column headers.");
  if (!records.length || records.length > 500) throw new Error("Import 1–500 rows.");
  return records.map((r, index) => {
    if (r.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${r.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
}
