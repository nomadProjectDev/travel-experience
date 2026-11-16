import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const decartKeyOnly = new Set(['DECART_API_KEY']);

function loadEnvFile(filePath: string, allowedKeys?: ReadonlySet<string>) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!key || (allowedKeys && !allowedKeys.has(key))) continue;
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

export function reloadEnvLocal() {
  loadEnvFile(path.join(projectRoot, '.env.local'));
  if (process.env.NODE_ENV !== 'production' && !process.env.DECART_API_KEY?.trim()) {
    loadEnvFile(path.resolve(projectRoot, '..', 'navidad', '.env.local'), decartKeyOnly);
  }
}

reloadEnvLocal();

