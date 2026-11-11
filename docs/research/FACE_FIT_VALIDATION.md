# Face-fit calibration and validation

Status: harness and protocol only. **No empirical calibration or validation has been completed.**
The files under `validation/face-fit/examples/` are synthetic, anonymized examples for exercising
the tools; they are not evidence of accuracy.

## Scope and claims

This harness evaluates repeatability, readiness, coarse S/M/L agreement, and errors against
optional ground truth. Iris-prior millimetre values use an approximate population prior and must
remain labelled estimates. They are not prescription or optician PD. Known-card calibration can
be compared only when the same capture contains both methods.

The versioned contract is `validation/face-fit/schema.v1.json`. It accepts study-local anonymous
participant IDs and rejects fields outside the schema, including names, contact details, image
paths, and arbitrary metadata. A calculated result records:

- model, pipeline schema, threshold configuration, and calibration versions;
- ratios, iris diameters, optional millimetre estimates, predicted S/M/L, pose, and face occupancy;
- quality status/reasons, frames/time to ready, inference delegate, and latency.

Optional ground truth includes binocular or monocular PD, face width, temple distance, comfortable
frame measurements, and an optician fit label. Capture conditions include device, browser,
resolution, distance, light, target pose, and whether eyewear is present.

## Data preparation

JSON manifests use the schema directly. CSV manifests use dot-separated headers for nested fields
and numeric array components, for example:

```text
session.resolution.width
groundTruth.monocularPdMm.left
results.0.outputRatios.ipdToFaceWidth
```

CSV supports two reserved metadata columns: `@datasetKind` (`example` or `study`) and
`@description`. JSON array-valued cells such as quality reasons must be CSV-quoted when they
contain commas. Empty cells omit optional values; literal `null` represents readiness values that
were never reached.

Each participant belongs wholly to either `calibration` or `test`. Never split captures from one
participant across both sets. Validation rejects duplicate capture IDs, participant leakage, and
duplicate calibration methods in one capture. Passing several files to a command validates them
together, so cross-file leakage and duplicate capture IDs are also caught.

```bash
npm run face-fit:validate -- validation/face-fit/examples/synthetic-example.json
npm run face-fit:validate -- \
  validation/face-fit/examples/synthetic-example.json \
  validation/face-fit/examples/synthetic-example.csv
npm run face-fit:report -- validation/face-fit/examples/synthetic-example.json
npm run face-fit:report -- study.json study-ground-truth.csv --output face-fit-report.json
npm run face-fit:test
```

Report JSON is versioned by `reportSchemaVersion`. It contains no images and no raw PII. Empty or
unavailable comparisons use zero counts and `null`, or `status: "not-computable"`; the runner does
not invent values.

## Stage 1: 10-person repeatability protocol

Purpose: debug collection, quantify within-person variation, and freeze a candidate threshold and
calibration configuration before a larger ground-truth pilot. This stage is not sufficient for a
population accuracy claim.

1. Recruit 10 consenting adults across a practical range of face sizes, eyewear use, devices, and
   skin presentation. Assign random study-local IDs; keep the re-identification key outside this
   repository and dataset.
2. Assign each participant to one split before capture. Use participants in the calibration split
   to tune thresholds. Do not inspect test-participant outcomes while tuning.
3. Record at least two sessions per participant, preferably on different days. Capture repeated
   frontal observations at target distance, then controlled near/far, low/indoor/bright/backlit,
   and target pose conditions. Randomize condition order where practical.
4. Aim for at least five accepted frontal target-condition repeats per participant and preserve
   rejected attempts. Rejections are data: do not silently rerun until success.
5. Record exact model, pipeline schema, threshold configuration, and calibration versions on every
   result. Record device model/category, browser, input resolution, delegate, and inference latency.
6. If testing known-card calibration, compute both `iris-prior` and `known-card` results from the
   same capture and store them in that capture's `results` array.
7. Review per-participant coefficient of variation (CV), readiness time/frames, rejection reasons,
   and device/condition slices. Freeze candidate versions before evaluating the held-out test
   participants.

CV is sample standard deviation divided by the absolute mean. It is reported only with at least
two usable observations and a non-zero mean. Rejected observations still contribute to rejection
and latency summaries; only ready observations contribute to time/frames-to-ready summaries.

## Stage 2: 25–40-person ground-truth pilot

Purpose: estimate error and failure modes against controlled measurements after the pipeline and
threshold versions are frozen.

1. Pre-register primary endpoints and acceptance bands before collection. Suggested primary
   endpoints are binocular PD estimate error, face-width estimate error, readiness/rejection, and
   S/M/L agreement. Optical specialists must approve any claim or acceptance band.
2. Recruit 25–40 consenting adults with participant-level calibration/test assignment fixed in
   advance. Use enough held-out test participants to report uncertainty honestly; do not promote
   repeated captures to independent participants.
3. Have a qualified operator collect binocular and/or monocular PD with an appropriate instrument,
   face width and temple distance with a documented method, comfortable frame box measurements,
   and an optician fit label where available. Record measurement protocol separately from the
   anonymous analysis manifest.
4. Capture repeats across the same controlled conditions used in Stage 1 and across supported
   device categories. Keep failed/rejected captures.
5. Freeze model, threshold, pipeline, and calibration versions during the test evaluation. Changes
   require a new version and a new held-out analysis.
6. Report MAE, median absolute error, P90/P95 absolute error, signed bias, and ground-truth coverage.
   Include participant repeatability, readiness latency, rejection rates, S/M/L agreement, and
   slices by device, distance, lighting, and pose. Always show denominators; small slices are
   descriptive, not generalizable.
7. Compare iris-prior and known-card MAE only for paired captures with both calculations and the
   relevant ground truth. A negative `maeDeltaKnownCardMinusIrisPrior` favors known-card. Do not
   infer superiority when comparable ground-truth count is zero or too small.

### Known-card geometry warning

The reference card and the measured facial feature must be in the **same plane relative to the
camera**. A card held closer to or farther from the camera creates perspective scale error, even
when card dimensions and detection are perfect. Avoid tilt, lens-edge distortion, and partial
occlusion. Define placement instructions and rejection tolerances before the pilot. Known-card
output is still an estimate unless the complete imaging geometry and measurement process have
been validated.

## Consent, privacy, and retention

- Obtain informed consent that separately describes camera capture, calculated facial geometry,
  optional optician measurements, purpose, access, retention, withdrawal, and any future reuse.
- Collect the minimum data required. Do not put names, email addresses, phone numbers, account IDs,
  IP addresses, or stable device identifiers in manifests.
- Store the participant-to-study-ID key separately with tighter access. Analysts should receive
  only pseudonymous manifests.
- Source images or video must not enter this repository, report output, tickets, or logs. If a
  separately approved study requires source media, use encrypted restricted storage and document
  its access and deletion controls outside this harness.
- Set a study-specific deletion date before recruitment. Delete source media as soon as quality
  review permits; retain derived anonymous measurements only for the consented period. Honor
  withdrawal by deleting linkable source and derived records where legally and operationally
  possible.
- Review local biometric/privacy requirements and complete the organization's data-protection
  process before recruitment. This protocol is engineering guidance, not legal or clinical advice.

## Reading the report

Accuracy coverage is the fraction of records with a relevant ground-truth value that also contain
the corresponding calculated estimate. Low coverage can make an apparently good error statistic
misleading. Signed bias preserves direction; positive means over-estimation. P90/P95 use the
nearest-rank definition. Per-capture method pairs are not a substitute for participant-level
confidence intervals, and multiple captures from one participant must not be treated as
independent population samples.
