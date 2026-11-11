import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATASET_SCHEMA_VERSION, assertValidDataset } from './schema.mjs';

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (quoted) throw new Error('Invalid CSV: unterminated quoted field');
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

function coerce(value) {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Keep non-JSON strings beginning with "[" or "{" as strings.
    }
  }
  return trimmed;
}

function setPath(target, dottedPath, value) {
  const parts = dottedPath.split('.');
  let cursor = target;
  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    const nextIsIndex = /^\d+$/.test(parts[index + 1] ?? '');
    const key = /^\d+$/.test(part) ? Number(part) : part;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    if (cursor[key] === undefined) cursor[key] = nextIsIndex ? [] : {};
    cursor = cursor[key];
  });
}

export function importCsv(text, options = {}) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row');
  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error('CSV headers cannot be empty');
  if (new Set(headers).size !== headers.length) throw new Error('CSV headers must be unique');

  const metadata = {};
  const records = rows.slice(1).map((cells, rowIndex) => {
    if (cells.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has ${cells.length} fields; expected ${headers.length}`);
    }
    const record = {};
    headers.forEach((header, columnIndex) => {
      const value = coerce(cells[columnIndex]);
      if (value === undefined) return;
      if (header === '@datasetKind' || header === '@description') {
        if (metadata[header] !== undefined && metadata[header] !== value) {
          throw new Error(`CSV metadata ${header} must be identical on every row`);
        }
        metadata[header] = value;
      } else {
        setPath(record, header, value);
      }
    });
    return record;
  });

  return {
    datasetSchemaVersion: DATASET_SCHEMA_VERSION,
    datasetKind: options.datasetKind ?? metadata['@datasetKind'] ?? 'study',
    ...(options.description || metadata['@description']
      ? { description: options.description ?? metadata['@description'] }
      : {}),
    records,
  };
}

export async function importDataset(path, options = {}) {
  const text = await readFile(path, 'utf8');
  const extension = extname(path instanceof URL ? fileURLToPath(path) : path).toLowerCase();
  let dataset;
  if (extension === '.json') {
    dataset = JSON.parse(text);
  } else if (extension === '.csv') {
    dataset = importCsv(text, options);
  } else {
    throw new Error(`Unsupported manifest extension "${extension}"; use .json or .csv`);
  }
  return assertValidDataset(dataset);
}
