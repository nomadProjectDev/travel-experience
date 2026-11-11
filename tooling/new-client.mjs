#!/usr/bin/env node
/**
 * Scaffold a new virtualFit client pack.
 * Usage: node tooling/new-client.mjs <client-id>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const clientsDir = path.join(root, 'config', 'clients');
const typesPath = path.join(root, 'config', 'types.ts');
const stylesIndexPath = path.join(root, 'src', 'styles', 'index.css');

const id = process.argv[2]?.trim();

if (!id) {
  console.error('Usage: npm run new-client -- <client-id>');
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Client id must be kebab-case (e.g. pilot-brand).');
  process.exit(1);
}

const reserved = ['eyewear', 'CHANGE_ME'];
if (reserved.includes(id)) {
  console.error(`Client id "${id}" is reserved or already exists.`);
  process.exit(1);
}

const clientDir = path.join(clientsDir, id);
const manifestPath = path.join(clientDir, 'manifest.ts');
if (fs.existsSync(manifestPath)) {
  console.error(`Manifest already exists: ${manifestPath}`);
  process.exit(1);
}

const titleCase = id
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');
const manifestIdentifier =
  id.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase()) + 'Manifest';

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  + ${path.relative(root, filePath)}`);
}

// --- copy ---
write(
  path.join(clientDir, 'copy.ts'),
  `import type { PlatformCopy } from '../../types';

const copy: PlatformCopy = {
  landing: {
    eyebrow: 'In-store fitting',
    titleLine1: '${titleCase}',
    titleLine2: 'Fitting Room',
    subtitle: 'See pieces on you in seconds.',
    privacyNote: 'Photo used only for this session.',
    microEdition: 'Season · In-store',
    microIssue: 'Virtual fitting',
    microRail: 'Mirror session',
    statusLines: ['Capture once.', 'Try pieces on.', 'See it on you in seconds.'],
    ctaLabel: 'Start try-on',
    ctaBusyLabel: 'Opening camera…',
  },
  generating: {
    statusLines: ['Analyzing portrait', 'Preparing studio light', 'Composing your look'],
    eyebrow: 'Styling in progress',
    eyebrowError: 'Please capture again',
    title: 'Building your look',
    titleError: 'We could not complete this fitting',
    subtitle: 'About 45 seconds',
    retryLabel: 'Retry fitting',
  },
  footer: {
    line: 'Powered by ${titleCase} © {year}',
  },
};

export default copy;
`,
);

// --- wardrobe ---
write(
  path.join(clientDir, 'wardrobe.ts'),
  `import type { WardrobeItem } from '../../types';
import { garmentUrl } from '../../wardrobePaths';

const CLIENT_ID = '${id}';

/** Add items after placing images in public/garments/${id}/ */
export const ${id.replace(/-/g, '_')}Wardrobe: WardrobeItem[] = [
  // { id: 'sample-top', name: 'Sample Top', url: garmentUrl(CLIENT_ID, 'tops', 'sample.jpg'), category: 'tops' },
];

export default ${id.replace(/-/g, '_')}Wardrobe;
`,
);

// --- manifest ---
write(
  path.join(clientDir, 'manifest.ts'),
  `import type { PlatformManifest } from '../../types';
import copy from './copy';
import wardrobe from './wardrobe';

const manifest: PlatformManifest = {
  clientId: '${id}',
  theme: '${id}',
  features: {
    videoLoop: true,
    wardrobeFeed: false,
  },
  brand: {
    productName: '${titleCase}',
    logoSrc: '/brand/${id}/logo.png',
    logoAlt: '${titleCase}',
  },
  wardrobe,
  copy,
};

export default manifest;
`,
);

// --- theme ---
const themePath = path.join(root, 'src', 'styles', 'themes', `${id}.css`);
write(
  themePath,
  `/**
 * ${titleCase} client skin — override brand primitives.
 */
[data-theme='${id}'] {
  --vf-bg-0: 236 240 248;
  --vf-bg-1: 244 247 252;
  --vf-surface-1: 255 255 255;
  --vf-surface-2: 238 242 250;
  --vf-rail: 241 245 252;
  --vf-accent: 32 64 128;
  --vf-accent-strong: 18 42 96;
  --vf-accent-ink: 248 250 255;
  --vf-border-strong: 96 140 200;
  --vf-focus: 96 140 200;
}
`,
);

const themeImport = `@import './themes/${id}.css';`;
let stylesIndex = fs.readFileSync(stylesIndexPath, 'utf8');
if (!stylesIndex.includes(themeImport)) {
  stylesIndex = stylesIndex.trimEnd() + `\n${themeImport}\n`;
  fs.writeFileSync(stylesIndexPath, stylesIndex, 'utf8');
  console.log(`  ~ ${path.relative(root, stylesIndexPath)} (theme import)`);
}

// --- PlatformTheme union ---
let typesSrc = fs.readFileSync(typesPath, 'utf8');
if (!typesSrc.includes(`'${id}'`) && typesSrc.includes('export type PlatformTheme')) {
  typesSrc = typesSrc.replace(
    /(export type PlatformTheme\s*=\s*[^;]+);/,
    (full, before) => `${before} | '${id}';`,
  );
  fs.writeFileSync(typesPath, typesSrc, 'utf8');
  console.log(`  ~ ${path.relative(root, typesPath)} (PlatformTheme)`);
}

// --- public dirs ---
write(path.join(root, 'public', 'brand', id, '.gitkeep'), '');
write(path.join(root, 'public', 'garments', id, 'tops', '.gitkeep'), '');

// --- config/registry.ts ---
const registryPath = path.join(root, 'config', 'registry.ts');
let registrySrc = fs.readFileSync(registryPath, 'utf8');
const registryImport = `import ${manifestIdentifier} from './clients/${id}/manifest';`;
if (!registrySrc.includes(registryImport)) {
  const importAnchor = registrySrc.match(/import \w+Manifest from '\.\/clients\/[^']+\/manifest';/);
  if (importAnchor) {
    registrySrc = registrySrc.replace(importAnchor[0], `${importAnchor[0]}\n${registryImport}`);
  } else {
    console.warn('  ⚠ could not find import anchor in config/registry.ts — add manually');
  }
}
const registryEntry = `  '${id}': ${manifestIdentifier},`;
if (!registrySrc.includes(`${manifestIdentifier},`)) {
  const entryAnchor = registrySrc.match(/^\s+'?[\w-]+'?:\s+\w+Manifest,/m);
  if (entryAnchor) {
    registrySrc = registrySrc.replace(entryAnchor[0], `${entryAnchor[0]}\n${registryEntry}`);
    fs.writeFileSync(registryPath, registrySrc, 'utf8');
    console.log(`  ~ ${path.relative(root, registryPath)} (registry)`);
  } else {
    console.warn('  ⚠ could not find registry entry anchor — add manually');
  }
} else {
  fs.writeFileSync(registryPath, registrySrc, 'utf8');
  console.log(`  ~ ${path.relative(root, registryPath)} (registry)`);
}

// --- CI matrix (.github/workflows/ci.yml) ---
const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');
if (fs.existsSync(ciPath)) {
  let ciSrc = fs.readFileSync(ciPath, 'utf8');
  const matrixRe = /(\s+client:\s+\[)([^\]]+)(\])/;
  const matrixMatch = ciSrc.match(matrixRe);
  if (matrixMatch) {
    const clients = matrixMatch[2]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
    if (!clients.includes(id)) {
      clients.push(id);
      const quoted = clients.map((c) => `'${c}'`).join(', ');
      ciSrc = ciSrc.replace(matrixRe, `${matrixMatch[1]}${quoted}${matrixMatch[3]}`);
      fs.writeFileSync(ciPath, ciSrc, 'utf8');
      console.log(`  ~ ${path.relative(root, ciPath)} (CI matrix)`);
    }
  } else {
    console.warn(`  ⚠ could not find client matrix in ${path.relative(root, ciPath)} — add "${id}" manually`);
  }
}

console.log(`\nClient "${id}" scaffolded.\n`);
console.log('Next steps:');
console.log(`  1. Add logo: public/brand/${id}/logo.png`);
console.log(`  2. Add garments: public/garments/${id}/tops/*.jpg`);
console.log(`  3. Edit config/clients/${id}/wardrobe.ts`);
console.log(`  4. VITE_CLIENT_ID=${id} npm run dev`);
console.log(`  5. npm run verify-clients`);
