/** Estimated relative face-fit panel (flagged and default-open). */

import React from 'react';
import {
  buildFaceFitMetricPresentation,
  type FaceFitMetricKey,
  type FaceFitResult,
} from '@/core/face';
import type { FaceFitCalibrationCopy } from './FaceFitCalibrationPanel';
import captureStyles from './CameraCapture.module.css';

export interface FaceFitPanelCopy {
  toggleLabel: string;
  toggleAria: string;
  closeAria: string;
  title: string;
  caveat: string;
  preliminaryLabel: string;
  states: Record<FaceFitUiState, string>;
  metrics: Record<FaceFitMetricKey, { label: string; explain: string }>;
  calibration?: FaceFitCalibrationCopy;
}

export type FaceFitUiState =
  | 'initializing'
  | 'searching'
  | 'singleFace'
  | 'poseUnavailable'
  | 'moveCloser'
  | 'moveFarther'
  | 'lookFront'
  | 'improveLighting'
  | 'holdSteady'
  | 'stabilizing'
  | 'ready'
  | 'limited'
  | 'runtimeFailure';

interface FaceFitMetricsPanelProps {
  result: FaceFitResult | null;
  state: FaceFitUiState;
  copy: FaceFitPanelCopy;
  open: boolean;
  onToggle: () => void;
  /** Live preview sits above shutter; confirm preview can sit higher. */
  placement: 'live' | 'preview';
}

const FaceFitMetricsPanel: React.FC<FaceFitMetricsPanelProps> = ({
  result,
  state,
  copy,
  open,
  onToggle,
  placement,
}) => {
  const presentation = buildFaceFitMetricPresentation(result, state === 'ready');

  return (
    <div className={captureStyles.faceFitPanelRoot} data-placement={placement}>
      {!open ? (
        <button
          type="button"
          className={captureStyles.faceFitPanelToggle}
          aria-expanded={false}
          aria-controls="face-fit-metrics-panel"
          aria-label={copy.toggleAria}
          onClick={onToggle}
        >
          {copy.toggleLabel}
        </button>
      ) : (
        <section
          id="face-fit-metrics-panel"
          className={captureStyles.faceFitPanel}
          aria-label={copy.title}
        >
          <header className={captureStyles.faceFitPanelHeader}>
            <h2 className={captureStyles.faceFitPanelTitle}>{copy.title}</h2>
            <button
              type="button"
              className={captureStyles.faceFitPanelClose}
              aria-label={copy.closeAria}
              onClick={onToggle}
            >
              ×
            </button>
          </header>

          <p className={captureStyles.faceFitPanelCaveat} role="status" aria-live="polite">
            {copy.states[state]}
          </p>
          <p className={captureStyles.faceFitPanelCaveat}>{copy.caveat}</p>

          {presentation.kind === 'preliminary' ? (
            <p className={captureStyles.faceFitPanelPreliminary}>
              {copy.preliminaryLabel}
            </p>
          ) : null}

          <ul
            className={captureStyles.faceFitPanelList}
            data-presentation={presentation.kind}
          >
            {presentation.rows.map((row) => {
              const meta = copy.metrics[row.key];
              return (
                <li key={row.key} className={captureStyles.faceFitPanelRow}>
                  <div className={captureStyles.faceFitPanelRowMain}>
                    <span className={captureStyles.faceFitPanelLabel}>{meta.label}</span>
                    <span className={captureStyles.faceFitPanelValue}>{row.value}</span>
                  </div>
                  <p className={captureStyles.faceFitPanelExplain}>{meta.explain}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};

export default FaceFitMetricsPanel;
