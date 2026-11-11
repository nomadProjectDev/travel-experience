import React, { useMemo, useState } from 'react';
import {
  compareFrameWidthsToEstimatedRange,
  estimateAbsoluteFaceSizeFromResult,
  type FaceFitResult,
} from '@/core/face';
import { publicPocFrameMeasurements } from '@config/clients/eyewear/frameMeasurements';
import type {
  CalibrationDistance,
  CalibrationLighting,
  CalibrationPoseTarget,
  CalibrationSplit,
  FaceFitCalibrationMetadata,
} from '@/services/face-fit-fixture-export.service';
import {
  DEFAULT_GROUND_TRUTH_METHOD,
  DEFAULT_GROUND_TRUTH_REPEATS,
  DEFAULT_GROUND_TRUTH_TOOL,
  FACE_FIT_CALIBRATION_STEPS,
  buildCalibrationGroundTruth,
  canExportCalibrationSample,
  createDefaultCalibrationIdentity,
  getCalibrationExportBlockers,
  nextIncompleteCalibrationStep,
  nextSimpleFrontalRepeat,
  parseMeasuredFaceWidthMm,
  simpleFrontalProtocol,
  type CalibrationExportBlocker,
} from './faceFitCalibration';
import captureStyles from './CameraCapture.module.css';

export interface FaceFitCalibrationCopy {
  eyebrow: string;
  title: string;
  warning: string;
  simpleHint: string;
  widthHint: string;
  widthPlaceholder: string;
  incompleteExport: string;
  readyToExport: string;
  privacy: string;
  consent: string;
  participantId: string;
  participantPlaceholder: string;
  sessionId: string;
  sessionPlaceholder: string;
  split: string;
  splits: Record<CalibrationSplit, string>;
  deviceLabel: string;
  devicePlaceholder: string;
  groundTruthFaceWidth: string;
  groundTruthMethod: string;
  groundTruthMethods: Record<
    'bizygomatic-caliper' | 'maximum-face-width-tape' | 'other',
    string
  >;
  groundTruthTool: string;
  groundTruthToolPlaceholder: string;
  groundTruthRepeats: string;
  distance: string;
  distances: Record<CalibrationDistance, string>;
  lighting: string;
  lightingStates: Record<CalibrationLighting, string>;
  pose: string;
  poses: Record<CalibrationPoseTarget, string>;
  eyewearPresent: string;
  quality: string;
  qualityStates: Record<FaceFitResult['status'], string>;
  noCapture: string;
  rawUnavailable: string;
  previous: string;
  next: string;
  export: string;
  exporting: string;
  exported: string;
  exportError: string;
  stepProgress: string;
  simpleRepeatProgress: string;
  labProtocolToggle: string;
  sandboxToggle: string;
  sandboxTitle: string;
  sandboxEstimate: string;
  sandboxCaveat: string;
  sandboxRejected: string;
  blockedReasons: Record<CalibrationExportBlocker, string>;
  steps: Record<(typeof FACE_FIT_CALIBRATION_STEPS)[number]['labelKey'], string>;
}

interface FaceFitCalibrationPanelProps {
  copy: FaceFitCalibrationCopy;
  result: FaceFitResult | null;
  capturedLandmarkCount: number | null;
  hasCapturedImage: boolean;
  analysisPending: boolean;
  onExport: (
    metadata: FaceFitCalibrationMetadata,
    protocol: { stepId: string; stepIndex: number; stepCount: number },
  ) => Promise<void>;
  onPrepareNextCapture: () => void;
  sizeSandboxEnabled: boolean;
}

const FaceFitCalibrationPanel: React.FC<FaceFitCalibrationPanelProps> = ({
  copy,
  result,
  capturedLandmarkCount,
  hasCapturedImage,
  analysisPending,
  onExport,
  onPrepareNextCapture,
  sizeSandboxEnabled,
}) => {
  const identityDefaults = useMemo(() => createDefaultCalibrationIdentity(), []);
  const [open, setOpen] = useState(true);
  const [labProtocol, setLabProtocol] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [simpleRepeatIndex, setSimpleRepeatIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(new Set());
  const [participantId, setParticipantId] = useState(identityDefaults.participantId);
  const [sessionId, setSessionId] = useState(identityDefaults.sessionId);
  const [split, setSplit] = useState<CalibrationSplit>('calibration');
  const [deviceLabel, setDeviceLabel] = useState(identityDefaults.deviceLabel);
  const [groundTruthFaceWidth, setGroundTruthFaceWidth] = useState('');
  const [groundTruthMethod, setGroundTruthMethod] = useState<
    'bizygomatic-caliper' | 'maximum-face-width-tape' | 'other'
  >(DEFAULT_GROUND_TRUTH_METHOD);
  const [groundTruthTool, setGroundTruthTool] = useState(DEFAULT_GROUND_TRUTH_TOOL);
  const [groundTruthRepeats, setGroundTruthRepeats] = useState(
    String(DEFAULT_GROUND_TRUTH_REPEATS),
  );
  const [distance, setDistance] = useState<CalibrationDistance>('target');
  const [lighting, setLighting] = useState<CalibrationLighting>('even');
  const [pose, setPose] = useState<CalibrationPoseTarget>('frontal');
  const [eyewearPresent, setEyewearPresent] = useState(false);
  const [consent, setConsent] = useState(true);
  const [exportState, setExportState] = useState<
    'idle' | 'exporting' | 'exported' | 'error'
  >('idle');
  const experimentalEstimate = useMemo(
    () => estimateAbsoluteFaceSizeFromResult(result),
    [result],
  );
  const sandboxRows = useMemo(() => {
    if (!sizeSandboxEnabled || experimentalEstimate.status !== 'usable') return [];
    return compareFrameWidthsToEstimatedRange(
      experimentalEstimate.estimatedFaceWidth,
      publicPocFrameMeasurements.map((frame) => ({
        id: frame.id,
        brand: frame.brand,
        model: frame.model,
        variantId: frame.variantId,
        color: frame.color,
        sizeVariant: frame.sizeVariant,
        totalFrontWidthMm: frame.totalFrontWidthMm,
        sourceUrl: frame.sourceUrl,
        sourceLabel: frame.provenance.sourceLabel,
        evidenceStatement: frame.provenance.statement,
        publishedSizeLabel: frame.publishedSizeLabel,
      })),
    );
  }, [experimentalEstimate, sizeSandboxEnabled]);

  const exportGate = {
    hasCapturedImage,
    analysisPending,
    capturedLandmarkCount,
    consent,
    participantId,
    sessionId,
    deviceLabel,
    groundTruthFaceWidth,
    exportState,
  };
  const blockers = getCalibrationExportBlockers(exportGate);
  const canExport = canExportCalibrationSample(exportGate);
  const measuredWidth = parseMeasuredFaceWidthMm(groundTruthFaceWidth);
  const step = FACE_FIT_CALIBRATION_STEPS[stepIndex];
  const primaryBlocker = blockers[0];

  const qualityText = useMemo(() => {
    if (analysisPending) return copy.blockedReasons.analyzing;
    if (!result) {
      return hasCapturedImage ? copy.rawUnavailable : copy.noCapture;
    }
    const reasons = result.rejectionReasons.join(', ');
    return reasons
      ? `${copy.qualityStates[result.status]} · ${reasons}`
      : copy.qualityStates[result.status];
  }, [analysisPending, copy, hasCapturedImage, result]);

  const selectStep = (index: number) => {
    const nextStep = FACE_FIT_CALIBRATION_STEPS[index];
    setStepIndex(index);
    setDistance(nextStep.distanceCondition);
    setLighting(nextStep.lighting);
    setPose(nextStep.poseTarget);
    setExportState('idle');
    onPrepareNextCapture();
  };

  const exportSample = async () => {
    if (!canExport) return;
    setExportState('exporting');
    const protocol = labProtocol
      ? {
          stepId: step.id,
          stepIndex: stepIndex + 1,
          stepCount: FACE_FIT_CALIBRATION_STEPS.length,
        }
      : simpleFrontalProtocol(simpleRepeatIndex);
    const groundTruthFaceWidthPayload = buildCalibrationGroundTruth({
      widthRaw: groundTruthFaceWidth,
      method: groundTruthMethod,
      toolRaw: groundTruthTool,
      repeatsRaw: groundTruthRepeats,
    });
    try {
      await onExport(
        {
          participantId: participantId.trim(),
          sessionId: sessionId.trim(),
          split,
          deviceLabel: deviceLabel.trim(),
          ...(groundTruthFaceWidthPayload
            ? { groundTruthFaceWidth: groundTruthFaceWidthPayload }
            : {}),
          distanceCondition: labProtocol ? distance : 'target',
          lighting: labProtocol ? lighting : 'even',
          poseTarget: labProtocol ? pose : 'frontal',
          eyewearPresent,
          consentAcknowledged: true,
        },
        protocol,
      );
      if (labProtocol) {
        const nextCompleted = new Set(completed).add(step.id);
        setCompleted(nextCompleted);
        setExportState('exported');
        const nextIndex = nextIncompleteCalibrationStep(stepIndex, nextCompleted);
        window.setTimeout(() => selectStep(nextIndex), 450);
        return;
      }
      setCompleted(new Set(completed).add(protocol.stepId));
      setSimpleRepeatIndex(nextSimpleFrontalRepeat(simpleRepeatIndex));
      setExportState('exported');
    } catch {
      setExportState('error');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className={captureStyles.calibrationPanelToggle}
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        {copy.title}
      </button>
    );
  }

  return (
    <aside
      className={captureStyles.calibrationPanel}
      aria-label={copy.title}
      data-lab-protocol={labProtocol ? 'on' : 'off'}
      data-can-export={canExport ? 'true' : 'false'}
      data-blocker={primaryBlocker ?? ''}
    >
      <header className={captureStyles.calibrationHeader}>
        <div>
          <span className={captureStyles.calibrationEyebrow}>{copy.eyebrow}</span>
          <h2 className={captureStyles.calibrationTitle}>{copy.title}</h2>
        </div>
        <span className={captureStyles.calibrationProgress}>
          {labProtocol
            ? copy.stepProgress
                .replace('{current}', String(stepIndex + 1))
                .replace('{total}', String(FACE_FIT_CALIBRATION_STEPS.length))
            : null}
        </span>
        <button
          type="button"
          className={captureStyles.calibrationClose}
          onClick={() => setOpen(false)}
          aria-label={copy.title}
        >
          ×
        </button>
      </header>

      <p className={captureStyles.calibrationWarning}>{copy.warning}</p>
      <p className={captureStyles.calibrationHint}>{copy.simpleHint}</p>

      <div className={captureStyles.calibrationQuality} data-status={result?.status ?? 'pending'}>
        <strong>{copy.quality}</strong>
        <span>{capturedLandmarkCount === 0 ? copy.rawUnavailable : qualityText}</span>
      </div>

      <label className={captureStyles.calibrationPrimary}>
        <span>{copy.groundTruthFaceWidth}</span>
        <input
          inputMode="decimal"
          value={groundTruthFaceWidth}
          onChange={(event) => {
            setGroundTruthFaceWidth(event.target.value);
            setExportState('idle');
          }}
          placeholder={copy.widthPlaceholder}
        />
        <small>{copy.widthHint}</small>
      </label>

      <p
        className={captureStyles.calibrationStatusNote}
        data-tone={measuredWidth.status === 'ok' ? 'ok' : 'warn'}
      >
        {measuredWidth.status === 'ok' ? copy.readyToExport : copy.incompleteExport}
      </p>

      <label className={captureStyles.calibrationConsent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            setExportState('idle');
          }}
        />
        <span>{copy.consent}</span>
      </label>
      <p className={captureStyles.calibrationPrivacy}>{copy.privacy}</p>

      {primaryBlocker ? (
        <p className={captureStyles.calibrationBlocker} role="status">
          {copy.blockedReasons[primaryBlocker]}
        </p>
      ) : null}

      <button
        type="button"
        className={captureStyles.calibrationExport}
        disabled={!canExport}
        onClick={() => void exportSample()}
      >
        {exportState === 'exporting'
          ? copy.exporting
          : exportState === 'exported'
            ? copy.exported
            : exportState === 'error'
              ? copy.exportError
              : copy.export}
      </button>

      <label className={captureStyles.calibrationLabToggle}>
        <input
          type="checkbox"
          checked={labProtocol}
          onChange={(event) => {
            setLabProtocol(event.target.checked);
            setExportState('idle');
          }}
        />
        <span>{copy.labProtocolToggle}</span>
      </label>

      {labProtocol ? (
        <>
          <div className={captureStyles.calibrationStepNav}>
            <button
              type="button"
              onClick={() => selectStep(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
            >
              {copy.previous}
            </button>
            <strong>{copy.steps[step.labelKey]}</strong>
            <button
              type="button"
              onClick={() =>
                selectStep(Math.min(FACE_FIT_CALIBRATION_STEPS.length - 1, stepIndex + 1))
              }
              disabled={stepIndex === FACE_FIT_CALIBRATION_STEPS.length - 1}
            >
              {copy.next}
            </button>
          </div>

          <div className={captureStyles.calibrationChecklist} aria-label={copy.stepProgress}>
            {FACE_FIT_CALIBRATION_STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-active={index === stepIndex}
                data-complete={completed.has(item.id)}
                onClick={() => selectStep(index)}
                aria-label={copy.steps[item.labelKey]}
              >
                {completed.has(item.id) ? '✓' : index + 1}
              </button>
            ))}
          </div>

          <div className={captureStyles.calibrationForm}>
            <label>
              <span>{copy.participantId}</span>
              <input
                value={participantId}
                onChange={(event) => setParticipantId(event.target.value)}
                placeholder={copy.participantPlaceholder}
                autoComplete="off"
              />
            </label>
            <label>
              <span>{copy.sessionId}</span>
              <input
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                placeholder={copy.sessionPlaceholder}
                autoComplete="off"
              />
            </label>
            <label>
              <span>{copy.split}</span>
              <select
                value={split}
                onChange={(event) => setSplit(event.target.value as CalibrationSplit)}
              >
                <option value="calibration">{copy.splits.calibration}</option>
                <option value="test">{copy.splits.test}</option>
              </select>
            </label>
            <label>
              <span>{copy.deviceLabel}</span>
              <input
                value={deviceLabel}
                onChange={(event) => setDeviceLabel(event.target.value)}
                placeholder={copy.devicePlaceholder}
                autoComplete="off"
              />
            </label>
            <label>
              <span>{copy.groundTruthMethod}</span>
              <select
                value={groundTruthMethod}
                onChange={(event) =>
                  setGroundTruthMethod(
                    event.target.value as
                      | 'bizygomatic-caliper'
                      | 'maximum-face-width-tape'
                      | 'other',
                  )
                }
              >
                <option value="bizygomatic-caliper">
                  {copy.groundTruthMethods['bizygomatic-caliper']}
                </option>
                <option value="maximum-face-width-tape">
                  {copy.groundTruthMethods['maximum-face-width-tape']}
                </option>
                <option value="other">{copy.groundTruthMethods.other}</option>
              </select>
            </label>
            <label>
              <span>{copy.groundTruthTool}</span>
              <input
                value={groundTruthTool}
                onChange={(event) => setGroundTruthTool(event.target.value)}
                placeholder={copy.groundTruthToolPlaceholder}
              />
            </label>
            <label>
              <span>{copy.groundTruthRepeats}</span>
              <input
                inputMode="numeric"
                value={groundTruthRepeats}
                onChange={(event) => setGroundTruthRepeats(event.target.value)}
              />
            </label>
            <label>
              <span>{copy.distance}</span>
              <select
                value={distance}
                onChange={(event) => setDistance(event.target.value as CalibrationDistance)}
              >
                {Object.entries(copy.distances).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{copy.lighting}</span>
              <select
                value={lighting}
                onChange={(event) => setLighting(event.target.value as CalibrationLighting)}
              >
                {Object.entries(copy.lightingStates).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{copy.pose}</span>
              <select
                value={pose}
                onChange={(event) => setPose(event.target.value as CalibrationPoseTarget)}
              >
                {Object.entries(copy.poses).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className={captureStyles.calibrationCheck}>
              <input
                type="checkbox"
                checked={eyewearPresent}
                onChange={(event) => setEyewearPresent(event.target.checked)}
              />
              <span>{copy.eyewearPresent}</span>
            </label>
          </div>
        </>
      ) : null}

      {sizeSandboxEnabled ? (
        <section className={captureStyles.sizeSandbox} aria-label={copy.sandboxToggle}>
          <button
            type="button"
            className={captureStyles.calibrationSecondaryToggle}
            aria-expanded={sandboxOpen}
            onClick={() => setSandboxOpen((current) => !current)}
          >
            {copy.sandboxToggle}
          </button>
          {sandboxOpen ? (
            <>
              <h3>{copy.sandboxTitle}</h3>
              {experimentalEstimate.status === 'usable' ? (
                <>
                  <p>
                    {copy.sandboxEstimate
                      .replace(
                        '{min}',
                        String(experimentalEstimate.estimatedFaceWidth.minMm),
                      )
                      .replace(
                        '{max}',
                        String(experimentalEstimate.estimatedFaceWidth.maxMm),
                      )
                      .replace('{confidence}', experimentalEstimate.confidence)}
                  </p>
                  <p>{copy.sandboxCaveat}</p>
                  <ul>
                    {sandboxRows.map((row) => (
                      <li key={row.variantId}>
                        <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                          {row.brand} · {row.model} · {row.color} · {row.sizeVariant}
                        </a>
                        <span>
                          {row.totalFrontWidthMm} mm · {row.position}
                          {row.deltaToRangeMm > 0
                            ? ` · Δ ${row.deltaToRangeMm} mm`
                            : ''}
                          {row.publishedSizeLabel
                            ? ` · ${row.publishedSizeLabel}`
                            : ''}
                        </span>
                        <small>
                          {row.sourceLabel} · {row.evidenceStatement}
                        </small>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>
                  {copy.sandboxRejected.replace(
                    '{reasons}',
                    experimentalEstimate.reasons.join(', '),
                  )}
                </p>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
};

export default FaceFitCalibrationPanel;
