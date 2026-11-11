#!/usr/bin/env node
/**
 * Dev entry: free PORT (default 8080), then start Express + Vite via tsx.
 * Usage: npm run dev  |  PORT=8081 npm run dev
 *
 * macOS / Linux (lsof). Re-running `npm run dev` is a reliable restart.
 */
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = String(process.env.PORT || '8080');

function pidsListeningOn(p) {
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${p}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(out.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function freePort(p) {
  const initial = pidsListeningOn(p);
  if (initial.length === 0) return;

  console.log(`[dev] Freeing port ${p} (pid ${initial.join(', ')})…`);
  for (const pid of initial) {
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch {
      /* already gone */
    }
  }

  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (pidsListeningOn(p).length === 0) return;
    sleepMs(50);
  }

  for (const pid of pidsListeningOn(p)) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  sleepMs(100);
}

freePort(port);

const child = spawn('tsx', ['server.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', PORT: port },
});

const forward = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on('SIGINT', () => forward('SIGINT'));
process.on('SIGTERM', () => forward('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 1);
});
