/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '@/shared/lib/utils';
import { useSfx } from '@/shared/context/useSfx';
import { useUiSfx } from '@/shared/hooks/useUiSfx';
import { formatFooterLine, getCopy } from '@config';
import styles from './Footer.module.css';

interface FooterProps {
  /** Light copy over dark landing surfaces. */
  tone?: 'default' | 'on-dark';
  /** When false, hide the SFX mute control (eyewear packs). */
  showSfxToggle?: boolean;
}

const Footer: React.FC<FooterProps> = ({
  tone = 'default',
  showSfxToggle = true,
}) => {
  const isOnDark = tone === 'on-dark';
  const { musicMuted, toggleMusicMuted, prefersReducedMotion } = useSfx();
  const { onTapClick } = useUiSfx({ volume: 0.4 });
  const footerLine = formatFooterLine(getCopy().footer.line);

  const handleToggleMuted = () => {
    onTapClick();
    toggleMusicMuted();
  };

  return (
    <footer
      className={cn(
        styles.footer,
        'app-footer',
        isOnDark && 'app-footer--on-dark',
      )}
      data-footer-tone={tone}
    >
      <div
        className={cn(
          styles.inner,
          'app-footer__inner',
          isOnDark ? styles.innerOnDark : styles.innerDefault
        )}
      >
        <p className={cn(styles.copy, isOnDark && styles.copyOnDark, isOnDark && 'app-footer__copy')}>
          {footerLine}
        </p>
        {showSfxToggle ? (
          <button
            type="button"
            onClick={handleToggleMuted}
            className={cn(
              styles.muteBtn,
              isOnDark ? styles.muteBtnOnDark : styles.muteBtnDefault,
              prefersReducedMotion && styles.muteBtnReduced
            )}
            aria-pressed={musicMuted}
            aria-label={musicMuted ? 'Unmute background music' : 'Mute background music'}
          >
            {prefersReducedMotion ? 'SFX (reduced motion)' : musicMuted ? 'SFX off' : 'SFX on'}
          </button>
        ) : null}
      </div>
    </footer>
  );
};

export default Footer;
