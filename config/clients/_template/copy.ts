import type { PlatformCopy } from '../../types';

const copy: PlatformCopy = {
  landing: {
    eyebrow: 'In-store fitting',
    titleLine1: 'Virtual Fitting',
    titleLine2: 'Room',
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
  captureQuality: {
    darkWarn: 'This photo looks very dark. Add frontal light or recapture.',
    blurWarn: 'This photo looks very soft. Hold steady and recapture.',
    continueLabel: 'Continue',
    recaptureLabel: 'Recapture',
  },
  footer: {
    line: 'Powered by {client} © {year}',
  },
};

export default copy;
