import type { CSSProperties } from 'react';
import type { PlatformCopy } from '@config/types';
import {
  CLAY_EFFECT_GROUPS,
  effectsInGroup,
  type ClayEffect,
  type ClayEffectGroup,
} from '@config/clients/navidad/effects';
import { cn } from '@/shared/lib/utils';
import styles from './EffectRail.module.css';

interface EffectRailProps {
  copy: NonNullable<PlatformCopy['brickStudio']>;
  activeEffectId: string;
  disabled: boolean;
  onSelect: (effect: ClayEffect) => void;
}

function groupTitle(
  group: ClayEffectGroup,
  copy: NonNullable<PlatformCopy['brickStudio']>,
): string {
  switch (group) {
    case 'restyle':
      return copy.restylesTitle;
    default: {
      const exhaustive: never = group;
      return exhaustive;
    }
  }
}

function EffectRail({
  copy,
  activeEffectId,
  disabled,
  onSelect,
}: EffectRailProps) {
  return (
    <div className={styles.rail}>
      {CLAY_EFFECT_GROUPS.map((group) => (
        <section key={group} className={styles.group} aria-label={groupTitle(group, copy)}>
          <h2 className={styles.groupTitle}>{groupTitle(group, copy)}</h2>
          <p className={styles.hint}>{copy.railHint}</p>
          <div className={styles.grid}>
            {effectsInGroup(group).map((effect) => {
              const selected = effect.id === activeEffectId;
              return (
                <button
                  key={effect.id}
                  type="button"
                  className={cn(styles.clay, selected && styles.claySelected)}
                  style={{
                    '--effect-color': effect.stud,
                    '--effect-ink': effect.ink === 'light' ? '#fff6e8' : '#3c2418',
                  } as CSSProperties}
                  aria-pressed={selected}
                  aria-label={copy.applyEffect.replace('{name}', effect.name)}
                  disabled={disabled}
                  onClick={() => onSelect(effect)}
                >
                  <span className={styles.preview} aria-hidden>
                    <span className={styles.previewGlyph}>
                      {effect.name.charAt(0)}
                    </span>
                    <span className={styles.previewAccent} />
                  </span>
                  <span className={styles.label}>
                    <span className={styles.name}>{effect.name}</span>
                    <span className={styles.kicker}>{effect.kicker}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default EffectRail;
