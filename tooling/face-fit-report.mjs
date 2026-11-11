#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { importDataset } from '../validation/face-fit/lib/import.mjs';
import { assertValidDataset } from '../validation/face-fit/lib/schema.mjs';
import { buildReport } from '../validation/face-fit/lib/report.mjs';

function parseArguments(arguments_) {
  const paths = [];
  let output;
  for (let index = 0; index < arguments_.length; index += 1) {
    if (arguments_[index] === '--output') {
      output = arguments_[index + 1];
      if (!output) throw new Error('--output requires a file path');
      index += 1;
    } else if (arguments_[index].startsWith('--')) {
      throw new Error(`Unknown option: ${arguments_[index]}`);
    } else {
      paths.push(arguments_[index]);
    }
  }
  return { paths, output };
}

try {
  const { paths, output } = parseArguments(process.argv.slice(2));
  if (!paths.length) {
    throw new Error(
      'Usage: npm run face-fit:report -- <manifest.json|manifest.csv> [...] [--output report.json]',
    );
  }
  const datasets = await Promise.all(paths.map((path) => importDataset(path)));
  const dataset = await assertValidDataset({
    datasetSchemaVersion: '1.0.0',
    datasetKind: datasets.some((item) => item.datasetKind === 'study') ? 'study' : 'example',
    records: datasets.flatMap((item) => item.records),
  });
  const serialized = `${JSON.stringify(buildReport(dataset), null, 2)}\n`;
  if (output) {
    await writeFile(output, serialized, 'utf8');
    console.log(`Wrote face-fit report ${output}`);
  } else {
    process.stdout.write(serialized);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
