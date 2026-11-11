import { RotateCcwIcon } from '@/shared/components/icons';
import type { CameraRotationDeg } from '@/core/media/cameraRotation';
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
