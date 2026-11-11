import React from 'react';
import { LANDING_THEME, type LandingTheme } from '@/shared/lib/theme';
import { cn } from '@/shared/lib/utils';
import styles from './KioskShell.module.css';

export interface KioskShellProps {
  children: React.ReactNode;
  className?: string;
  theme?: LandingTheme;
}

const KioskShell: React.FC<KioskShellProps> = ({
  children,
  className,
  theme = LANDING_THEME,
}) => (
  <div className={cn(styles.root, className)} data-theme={theme}>
    <div className={styles.ambient} aria-hidden />
    <div className={styles.content}>{children}</div>
  </div>
);

export default KioskShell;
