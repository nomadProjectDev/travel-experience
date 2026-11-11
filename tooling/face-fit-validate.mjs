#!/usr/bin/env node
import { importDataset } from '../validation/face-fit/lib/import.mjs';
import { assertValidDataset } from '../validation/face-fit/lib/schema.mjs';

function usage() {
  console.error('Usage: npm run face-fit:validate -- <manifest.json|manifest.csv> [...]');
}

const paths = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
if (!paths.length) {
  usage();
  process.exitCode = 1;
} else {
  try {
    const datasets = await Promise.all(paths.map((path) => importDataset(path)));
    const combined = {
      datasetSchemaVersion: '1.0.0',
      datasetKind: datasets.some((dataset) => dataset.datasetKind === 'study') ? 'study' : 'example',
      records: datasets.flatMap((dataset) => dataset.records),
    };
    await assertValidDataset(combined);
    console.log(
      `Valid face-fit dataset: ${combined.records.length} captures, ${
        new Set(combined.records.map((record) => record.participantAnonId)).size
      } participants (${paths.length} manifest${paths.length === 1 ? '' : 's'}).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
