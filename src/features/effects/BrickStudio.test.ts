import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as cameraRotation from '@/core/media/cameraRotation';
import * as cameraRotationUi from '@/shared/ui/CameraRotationButton';
import * as useBrickSessionModule from './useBrickSession';
import BrickStudio from './BrickStudio';

function mockSession(
  overrides: Partial<ReturnType<typeof useBrickSessionModule.useBrickSession>> = {},
): ReturnType<typeof useBrickSessionModule.useBrickSession> {
  return {
    screen: { name: 'live', destinationId: 'mexico', effectId: 'mexico-hombre' },
    status: 'live',
    remoteStream: {} as MediaStream,
    error: null,
    isOpeningCamera: false,
    openCountryHome: vi.fn(),
    chooseDestination: vi.fn(),
    chooseLook: vi.fn(),
    switchLook: vi.fn(),
    returnToCountries: vi.fn(),
    returnToLanding: vi.fn(),
    retry: vi.fn(),
    reorient: vi.fn(),
    ...overrides,
  };
}

describe('BrickStudio camera rotation & live stage gating', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('initializes cameraRotationDeg from resolveCameraRotationDeg() and mounts technician hotspot on every screen', () => {
    const resolveSpy = vi
      .spyOn(cameraRotation, 'resolveCameraRotationDeg')
      .mockReturnValue(270);

    for (const screen of [
      { name: 'landing' } as const,
      { name: 'countries' } as const,
      { name: 'variant', destinationId: 'mexico' } as const,
      { name: 'live', destinationId: 'mexico', effectId: 'mexico-hombre' } as const,
    ]) {
      vi.spyOn(useBrickSessionModule, 'useBrickSession').mockReturnValue(
        mockSession({ screen }),
      );
      const html = renderToStaticMarkup(createElement(BrickStudio));
      expect(html).toContain('Ajuste técnico de rotación de cámara');
    }

    expect(resolveSpy).toHaveBeenCalledTimes(4);
  });

  it('mirrors upright 0° video without quarter-turn scale, avoids double-mirror at 90°/180°/270°, and prevents 3x landscape zoom in CSS', () => {
    vi.spyOn(useBrickSessionModule, 'useBrickSession').mockReturnValue(mockSession());

    vi.spyOn(cameraRotation, 'resolveCameraRotationDeg').mockReturnValue(0);
    const html0 = renderToStaticMarkup(createElement(BrickStudio));
    expect(html0).toContain('videoMirrored');
    expect(html0).not.toContain('--remote-frame-scale');
    expect(html0).not.toContain('videoQuarter');

    vi.spyOn(cameraRotation, 'resolveCameraRotationDeg').mockReturnValue(180);
    const html180 = renderToStaticMarkup(createElement(BrickStudio));
    expect(html180).not.toContain('videoMirrored');
    expect(html180).not.toContain('--remote-frame-scale');
    expect(html180).not.toContain('videoQuarter');

    vi.spyOn(cameraRotation, 'resolveCameraRotationDeg').mockReturnValue(90);
    const html90 = renderToStaticMarkup(createElement(BrickStudio));
    expect(html90).toContain('videoQuarter');
    expect(html90).toContain('--remote-frame-scale');
    expect(html90).not.toContain('videoMirrored');

    const css = readFileSync(
      join(process.cwd(), 'src/features/effects/BrickStudio.module.css'),
      'utf8',
    );
    expect(css).not.toContain('width: calc(100cqw * var(--remote-frame-scale))');
    expect(css).toContain('--portrait-col-width: max(100cqw, calc(100cqh * 9 / 16))');
    expect(css).toContain('@container (orientation: landscape)');
    expect(css).toContain('width: calc(var(--portrait-col-width) * var(--remote-frame-scale))');
  });

  it('persists technician rotation selection to localStorage and triggers live reorientation when changed', () => {
    const stored = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
      location: { search: '' },
    });

    vi.spyOn(cameraRotation, 'resolveCameraRotationDeg').mockReturnValue(0);
    const reorient = vi.fn();
    vi.spyOn(useBrickSessionModule, 'useBrickSession').mockReturnValue(
      mockSession({ reorient }),
    );

    let capturedOnRotate: ((next?: cameraRotation.CameraRotationDeg) => void) | null = null;
    vi.spyOn(cameraRotationUi, 'TechnicianRotationOverlay').mockImplementation((props) => {
      capturedOnRotate = props.onRotate;
      return createElement('span');
    });

    renderToStaticMarkup(createElement(BrickStudio));
    expect(capturedOnRotate).toBeTypeOf('function');

    // Selecting the same angle (0°) saves without restarting the live session
    capturedOnRotate!(0);
    expect(stored.get(cameraRotation.CAMERA_ROTATION_STORAGE_KEY)).toBe('0');
    expect(reorient).not.toHaveBeenCalled();

    // Selecting 90° persists to localStorage and restarts the live stream at 90°
    capturedOnRotate!(90);
    expect(stored.get(cameraRotation.CAMERA_ROTATION_STORAGE_KEY)).toBe('90');
    expect(reorient).toHaveBeenCalledTimes(1);
    expect(reorient).toHaveBeenCalledWith(90);
  });

  it('keeps the video hidden while status is connecting even if a stream reference exists', () => {
    vi.spyOn(cameraRotation, 'resolveCameraRotationDeg').mockReturnValue(0);

    vi.spyOn(useBrickSessionModule, 'useBrickSession').mockReturnValue(
      mockSession({
        screen: { name: 'live', destinationId: 'peru', effectId: 'peru-mujer' },
        status: 'connecting',
      }),
    );

    const html = renderToStaticMarkup(createElement(BrickStudio));

    expect(html).not.toContain('<video');
  });
});
