import { readFile } from 'node:fs/promises';

const schemaUrl = new URL('../schema.v1.json', import.meta.url);

export const DATASET_SCHEMA_VERSION = '1.0.0';
export const LATEST_DATASET_SCHEMA_VERSION = '2.0.0';

export async function loadSchema() {
  return JSON.parse(await readFile(schemaUrl, 'utf8'));
}

function typeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported schema reference: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((value, part) => value[part.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function validateNode(value, node, root, path, errors) {
  if (node.$ref) {
    validateNode(value, resolveRef(root, node.$ref), root, path, errors);
    return;
  }

  if ('const' in node && value !== node.const) {
    errors.push(`${path} must equal ${JSON.stringify(node.const)}`);
  }
  if (node.enum && !node.enum.includes(value)) {
    errors.push(`${path} must be one of ${node.enum.join(', ')}`);
  }

  const allowedTypes = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  if (allowedTypes.length && !allowedTypes.some((type) => typeMatches(value, type))) {
    errors.push(`${path} must be ${allowedTypes.join(' or ')}`);
    return;
  }

  if (typeof value === 'string') {
    if (node.minLength !== undefined && value.length < node.minLength) {
      errors.push(`${path} must have at least ${node.minLength} characters`);
    }
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      errors.push(`${path} does not match ${node.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (node.minimum !== undefined && value < node.minimum) errors.push(`${path} must be >= ${node.minimum}`);
    if (node.maximum !== undefined && value > node.maximum) errors.push(`${path} must be <= ${node.maximum}`);
    if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) {
      errors.push(`${path} must be > ${node.exclusiveMinimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) {
      errors.push(`${path} must contain at least ${node.minItems} item(s)`);
    }
    if (node.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) errors.push(`${path} must contain unique items`);
    }
    value.forEach((item, index) => validateNode(item, node.items ?? {}, root, `${path}[${index}]`, errors));
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const properties = node.properties ?? {};
    for (const required of node.required ?? []) {
      if (!(required in value)) errors.push(`${path}.${required} is required`);
    }
    if (node.minProperties !== undefined && Object.keys(value).length < node.minProperties) {
      errors.push(`${path} must contain at least ${node.minProperties} property`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) validateNode(child, properties[key], root, `${path}.${key}`, errors);
      else if (node.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
    }
  }
}

export async function validateDataset(dataset) {
  const schema = await loadSchema();
  const errors = [];
  validateNode(dataset, schema, schema, '$', errors);
  if (errors.length) return { ok: false, errors };

  const captureIds = new Set();
  const participantSplits = new Map();
  for (const record of dataset.records) {
    if (captureIds.has(record.captureId)) errors.push(`duplicate captureId: ${record.captureId}`);
    captureIds.add(record.captureId);

    const priorSplit = participantSplits.get(record.participantAnonId);
    if (priorSplit && priorSplit !== record.split) {
      errors.push(
        `participant leakage: ${record.participantAnonId} occurs in both ${priorSplit} and ${record.split}`,
      );
    }
    participantSplits.set(record.participantAnonId, record.split);

    const methods = record.results.map((result) => result.calibrationMethod);
    if (new Set(methods).size !== methods.length) {
      errors.push(`duplicate calibrationMethod in capture ${record.captureId}`);
    }
    for (const result of record.results) {
      if (dataset.datasetSchemaVersion === LATEST_DATASET_SCHEMA_VERSION && !result.experimentalFaceSize) {
        errors.push(`experimentalFaceSize is required for v2 capture ${record.captureId}`);
      }
      const range = result.experimentalFaceSize?.estimatedFaceWidthMm;
      if (range && range.min > range.max) {
        errors.push(`invalid experimental face-width range in capture ${record.captureId}`);
      }
      if (
        result.experimentalFaceSize?.status === 'usable' &&
        (!range || !Number.isFinite(result.experimentalFaceSize.centralEstimateMm))
      ) {
        errors.push(`usable experimentalFaceSize requires range and center in capture ${record.captureId}`);
      }
      if (
        result.experimentalFaceSize?.status === 'rejected' &&
        (range || result.experimentalFaceSize.centralEstimateMm !== undefined)
      ) {
        errors.push(`rejected experimentalFaceSize cannot include an estimate in capture ${record.captureId}`);
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

export async function assertValidDataset(dataset) {
  const validation = await validateDataset(dataset);
  if (!validation.ok) throw new Error(`Invalid face-fit dataset:\n- ${validation.errors.join('\n- ')}`);
  return dataset;
}
