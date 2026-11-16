#!/usr/bin/env node
/**
 * Verify registered client packs have required assets on disk.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'config', 'registry.ts');

const registrySrc = fs.readFileSync(registryPath, 'utf8');
const clientIds = [
  ...registrySrc.matchAll(/^\s+'?([a-z][a-z0-9-]*)'?:\s+\w+Manifest,/gm),
].map((m) => m[1]);

if (clientIds.length === 0) {
  console.error('No clients found in config/registry.ts');
  process.exit(1);
}

let failed = false;

for (const clientId of clientIds) {
  const clientDir = path.join(root, 'config', 'clients', clientId);
  const manifestPath = path.join(clientDir, 'manifest.ts');
  const wardrobePath = path.join(clientDir, 'wardrobe.ts');
  const copyPath = path.join(clientDir, 'copy.ts');
  const logoPath = path.join(root, 'public', 'brand', clientId, 'logo.png');
  const themePath = path.join(root, 'src', 'styles', 'themes', `${clientId}.css`);

  const checks = [
    [manifestPath, 'manifest'],
    [wardrobePath, 'wardrobe module'],
    [copyPath, 'copy module'],
    [logoPath, 'logo.png'],
  ];

  console.log(`\n[${clientId}]`);
  for (const [filePath, label] of checks) {
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ missing ${label}: ${path.relative(root, filePath)}`);
      failed = true;
    } else {
      console.log(`  ✓ ${label}`);
    }
  }

  const wardrobeSrc = fs.existsSync(wardrobePath) ? fs.readFileSync(wardrobePath, 'utf8') : '';
  // Prefer `id:` entries (works with helpers); fall back to `category:` for flat packs.
  const itemCount = Math.max(
    (wardrobeSrc.match(/^\s*id:\s*['"`]/gm) || []).length,
    (wardrobeSrc.match(/category:\s*['"`]/g) || []).length,
  );
  const effectsPath = path.join(clientDir, 'effects.ts');
  const effectsSrc = fs.existsSync(effectsPath) ? fs.readFileSync(effectsPath, 'utf8') : '';
  const effectCount = (effectsSrc.match(/^\s*id:\s*['"`]/gm) || []).length;
  if (itemCount === 0 && effectCount === 0) {
    console.error(`  ✗ wardrobe has 0 items — add garments in config/clients/${clientId}/wardrobe.ts`);
    failed = true;
  } else if (effectCount > 0) {
    console.log(`  ✓ effects: ${effectCount}`);
  } else {
    console.log(`  ✓ wardrobe items: ${itemCount}`);
  }

  const manifestSrc = fs.readFileSync(manifestPath, 'utf8');
  const themeMatch = manifestSrc.match(/theme:\s*'([^']+)'/);
  const themeName = themeMatch?.[1];
  if (themeName && themeName !== 'default' && themeName !== 'lifestyle-sport' && themeName !== 'dark') {
    if (!fs.existsSync(themePath)) {
      console.error(`  ✗ missing theme css for "${themeName}"`);
      failed = true;
    } else {
      console.log(`  ✓ theme: ${themeName}`);
    }
  }
}

console.log('');
if (failed) {
  console.error('Client pack verification failed.');
  process.exit(1);
}
console.log('All registered client packs passed filesystem checks.');
