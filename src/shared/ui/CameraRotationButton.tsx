import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcwIcon } from '@/shared/components/icons';
import {
  CAMERA_ROTATION_ANGLES,
  nextCameraRotationDeg,
  type CameraRotationDeg,
} from '@/core/media/cameraRotation';
import styles from './CameraRotationButton.module.css';

type CameraRotationButtonProps = {
  rotationDeg: CameraRotationDeg;
  onRotate: () => void;
  disabled?: boolean;
  className?: string;
};

export default function CameraRotationButton({
  rotationDeg,
  onRotate,
  disabled = false,
  className,
}: CameraRotationButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      onClick={onRotate}
      disabled={disabled}
      aria-label={`Rotar cámara. Orientación actual ${rotationDeg} grados`}
      title={disabled ? 'Orientación fija durante la sesión' : 'Rotar cámara 90°'}
    >
      <RotateCcwIcon className={styles.icon} aria-hidden />
      <span>Cámara</span>
      <span className={styles.angle}>{rotationDeg}°</span>
    </button>
  );
}

type TechnicianRotationOverlayProps = {
  rotationDeg: CameraRotationDeg;
  onRotate: (next?: CameraRotationDeg) => void;
};

/**
 * Hidden 5-tap top-left hotspot + Shift+R shortcut (MUPI technician pattern)
 * that reveals the 0° / 90° / 180° / 270° camera rotation selector pill.
 */
export function TechnicianRotationOverlay({
  rotationDeg,
  onRotate,
}: TechnicianRotationOverlayProps) {
  const [open, setOpen] = useState(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const autoHideTimerRef = useRef<number | null>(null);

  const armAutoHide = useCallback(() => {
    if (autoHideTimerRef.current !== null) {
      window.clearTimeout(autoHideTimerRef.current);
    }
    autoHideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 6000);
  }, []);

  const selectRotation = useCallback(
    (next?: CameraRotationDeg) => {
      onRotate(next);
      setOpen(true);
      armAutoHide();
    },
    [armAutoHide, onRotate],
  );

  const handleHotspotTap = () => {
    const now = Date.now();
    const recent = tapTimestampsRef.current.filter((ts) => now - ts < 3000);
    recent.push(now);
    tapTimestampsRef.current = recent;
    if (recent.length < 5) return;
    tapTimestampsRef.current = [];
    setOpen((prev) => {
      const next = !prev;
      if (next) armAutoHide();
      else if (autoHideTimerRef.current !== null) {
        window.clearTimeout(autoHideTimerRef.current);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current !== null) {
        window.clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!event.shiftKey || (event.key !== 'R' && event.key !== 'r')) return;
      event.preventDefault();
      selectRotation(nextCameraRotationDeg(rotationDeg));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [rotationDeg, selectRotation]);

  return (
    <>
      <button
        type="button"
        className={styles.techHotspot}
        onClick={handleHotspotTap}
        aria-label="Ajuste técnico de rotación de cámara"
        tabIndex={-1}
      />
      {open ? (
        <div className={styles.rotationPillAnchor}>
          <div className={styles.rotationPill}>
            <CameraRotationButton
              rotationDeg={rotationDeg}
              onRotate={() => selectRotation()}
            />
            <div
              className={styles.rotationAngles}
              role="group"
              aria-label="Rotación de cámara"
            >
              {CAMERA_ROTATION_ANGLES.map((angle) => (
                <button
                  key={angle}
                  type="button"
                  className={styles.rotationAngle}
                  data-active={rotationDeg === angle}
                  onClick={() => selectRotation(angle)}
                >
                  {angle}°
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.rotationClose}
              onClick={() => setOpen(false)}
              aria-label="Cerrar selector de rotación"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
